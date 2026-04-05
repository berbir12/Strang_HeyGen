"""
Strang backend — educational video generation API.

Architecture:
- FastAPI with BackgroundTasks: /generate returns immediately, work runs async.
- SQLite persistence (aiosqlite): jobs, waitlist, users, screenplay cache.
- Auth: Supabase JWT with legacy API-key fallback.
- Payments: Stripe Checkout + webhook for subscription lifecycle.
- Retry on transient failures (tenacity) for OpenAI (screenplay) & HeyGen (video) calls.
- Structured logging throughout.
"""

import hashlib
import logging
import sys
import time
import uuid

from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response

import config
from models.schemas import (
    GenerateRequest,
    GenerateResponse,
    Screenplay,
    StatusResponse,
    WaitlistCountResponse,
    WaitlistPositionResponse,
    WaitlistRequest,
    WaitlistResponse,
)
from services.heygen_service import heygen_create_video, heygen_get_status
from services.openai_director import get_screenplay
from services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    handle_webhook_event,
)
from storage.database import (
    add_email,
    cache_screenplay,
    create_job,
    create_user,
    get_cached_screenplay,
    get_job,
    get_user,
    get_waitlist_count,
    get_waitlist_entry,
    get_waitlist_position,
    increment_videos_generated,
    init_db,
    update_job,
)
from utils.auth import require_auth
from utils.rate_limit import rate_limit_check

logger = logging.getLogger("strang")


# ---------------------------------------------------------------------------
# Discord notification helper
# ---------------------------------------------------------------------------

async def _notify_discord_waitlist(email: str, position: int, total: int, is_new: bool) -> None:
    """Fire-and-forget Discord embed on every waitlist signup. Silent on failure."""
    if not config.DISCORD_WEBHOOK_URL:
        return
    try:
        import httpx

        action = "New Signup" if is_new else "Re-joined"
        payload = {
            "embeds": [
                {
                    "title": f"Strang Waitlist — {action}!",
                    "color": 0x6366F1,  # indigo to match the brand
                    "fields": [
                        {"name": "Email", "value": email, "inline": True},
                        {"name": "Queue Position", "value": f"#{position:,}", "inline": True},
                        {"name": "Total Signups", "value": f"{total:,}", "inline": True},
                    ],
                    "footer": {"text": "thestrang.com waitlist"},
                }
            ]
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(config.DISCORD_WEBHOOK_URL, json=payload)
    except Exception as exc:
        logger.warning("Discord notification failed: %s", exc)


# ---------------------------------------------------------------------------
# Provider status cache — avoids hammering HeyGen on every client poll
# TTL of 10 seconds is safe: short enough to feel responsive, long enough to
# collapse burst polls from a single job into one external request.
# ---------------------------------------------------------------------------
_status_cache: dict[str, tuple[float, dict]] = {}
_STATUS_CACHE_TTL = 10  # seconds

# HeyGen jobs that stay in "processing" beyond this threshold are force-failed.
_HEYGEN_TIMEOUT_MINUTES = 15


async def _get_cached_heygen_status(video_id: str) -> dict:
    """Return cached HeyGen status if fresh, otherwise fetch and cache it."""
    now = time.monotonic()
    cached = _status_cache.get(video_id)
    if cached:
        ts, result = cached
        if now - ts < _STATUS_CACHE_TTL:
            return result

    result = await heygen_get_status(video_id)
    _status_cache[video_id] = (now, result)
    return result


def _evict_status_cache(video_id: str) -> None:
    """Remove a video from the status cache once its job reaches a terminal state."""
    _status_cache.pop(video_id, None)


# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

def _setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root = logging.getLogger("strang")
    root.setLevel(logging.INFO)
    root.addHandler(handler)


# ---------------------------------------------------------------------------
# Subscription check helper
# ---------------------------------------------------------------------------

async def _ensure_user_record(user: dict) -> dict:
    """Ensure a user row exists in SQLite. Returns the DB record."""
    if user["role"] == "admin":
        return {**user, "subscription_status": "active", "plan": "pro", "videos_generated": 0, "videos_limit": 999999}
    record = await get_user(user["user_id"])
    if not record:
        record = await create_user(user["user_id"], user.get("email", ""))
    return record


async def require_subscription(request: Request, user: dict = Depends(require_auth)) -> dict:
    """Gate video generation behind subscription / free-tier limit."""
    record = await _ensure_user_record(user)
    if record.get("subscription_status") in ("active", "trialing"):
        return {**user, **record}

    if record["videos_generated"] >= record["videos_limit"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Free tier limit reached ({record['videos_limit']} videos). "
                "Subscribe to generate more."
            ),
        )
    return {**user, **record}


# ---------------------------------------------------------------------------
# Background worker
# ---------------------------------------------------------------------------

async def process_video_job(
    job_id: str,
    text: str,
    user_id: str | None = None,
) -> None:
    """Background task: OpenAI screenplay -> HeyGen video creation."""
    try:
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        cached = await get_cached_screenplay(text_hash)

        if cached:
            screenplay = Screenplay.model_validate(cached)
            logger.info("Cache hit for job %s", job_id)
        else:
            screenplay = await get_screenplay(text)
            await cache_screenplay(text_hash, screenplay.model_dump_json())
            logger.info("Screenplay generated for job %s", job_id)

        video_id = await heygen_create_video(screenplay)
        await update_job(job_id, video_id=video_id, status="processing")
        logger.info(
            "HeyGen video queued for job %s (video_id=%s)",
            job_id,
            video_id,
        )

        if user_id and user_id not in ("admin", "anonymous"):
            await increment_videos_generated(user_id)

    except HTTPException as exc:
        logger.error("Job %s failed: %s", job_id, exc.detail)
        await update_job(job_id, status="failed", error=exc.detail)
    except Exception as exc:
        logger.error("Job %s failed unexpectedly: %s", job_id, exc, exc_info=True)
        await update_job(job_id, status="failed", error=str(exc))


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI):
    _setup_logging()
    await init_db()
    logger.info(
        "Strang API started (CORS raw=%r, %d origin(s))",
        config.CORS_ORIGINS_RAW,
        len(config.CORS_ORIGINS),
    )
    yield
    logger.info("Strang API shutting down")


app = FastAPI(title="Strang API", version="2.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    """Ensure every error returns JSON so the extension never sees plain-text bodies."""
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    detail = str(exc) if str(exc) else "An unexpected error occurred"
    logger.error("Unhandled exception: %s", detail, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": detail})


# ---------------------------------------------------------------------------
# Manual CORS hardening
# ---------------------------------------------------------------------------
# Some reverse proxies / platforms can interfere with CORSMiddleware headers,
# which breaks browser preflight. This middleware ensures we always emit
# the required `Access-Control-Allow-Origin` header (and handle OPTIONS).
@app.middleware("http")
async def _manual_cors(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        allow_all = config.CORS_ORIGINS_RAW == "*"
        # Match with/without trailing slash (browsers send no trailing slash).
        origin_key = origin.strip().rstrip("/")
        origin_allowed = allow_all or origin_key in config.CORS_ORIGINS

        if origin_allowed:
            # Preflight requests must return CORS headers with no body.
            if request.method == "OPTIONS":
                resp = Response(status_code=204)
            else:
                resp = await call_next(request)

            resp.headers["Access-Control-Allow-Origin"] = "*" if allow_all else origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Methods"] = request.headers.get(
                "access-control-request-method", "*"
            )
            resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
                "access-control-request-headers", "*"
            )
            # Only set credentials header when we are not using wildcard origins.
            if not allow_all:
                if config.CORS_ORIGINS_RAW != "*":
                    resp.headers["Access-Control-Allow-Credentials"] = "true"
            return resp

    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    # `Access-Control-Allow-Origin: *` cannot be combined with credentials.
    # If CORS_ORIGINS is left as "*" we disable credentials so browsers
    # don't reject the preflight request.
    allow_credentials=config.CORS_ORIGINS_RAW != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.get("/auth/me")
async def auth_me(user: dict = Depends(require_auth)):
    """Return current user info and subscription status."""
    record = await _ensure_user_record(user)
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "plan": record.get("plan", "free"),
        "subscription_status": record.get("subscription_status", "free"),
        "videos_generated": record.get("videos_generated", 0),
        "videos_limit": record.get("videos_limit", config.FREE_TIER_VIDEO_LIMIT),
    }


@app.post("/auth/refresh")
async def refresh_token(request: Request):
    """Exchange a Supabase refresh token for a new access token.

    Called by the Chrome extension when the access token has expired (401).
    Proxies to Supabase so the extension never needs to embed Supabase credentials.
    """
    if not config.SUPABASE_URL or not config.SUPABASE_ANON_KEY:
        raise HTTPException(status_code=501, detail="Token refresh not configured on this server.")

    body = await request.json()
    rt = (body or {}).get("refresh_token", "").strip()
    if not rt:
        raise HTTPException(status_code=400, detail="refresh_token is required.")

    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                headers={
                    "apikey": config.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                json={"refresh_token": rt},
            )
    except Exception as exc:
        logger.warning("Token refresh network error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach auth server.")

    if not res.is_success:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    data = res.json()
    return {
        "access_token": data.get("access_token", ""),
        "refresh_token": data.get("refresh_token", rt),
    }


# ---------------------------------------------------------------------------
# Stripe routes
# ---------------------------------------------------------------------------

@app.post("/stripe/checkout")
async def stripe_checkout(user: dict = Depends(require_auth)):
    """Create a Stripe Checkout Session and return the URL."""
    url = await create_checkout_session(user["user_id"], user.get("email", ""))
    return {"url": url}


@app.post("/stripe/portal")
async def stripe_portal(user: dict = Depends(require_auth)):
    """Create a Stripe Customer Portal session."""
    url = await create_portal_session(user["user_id"])
    return {"url": url}


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (no auth — Stripe signs the payload)."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    await handle_webhook_event(payload, sig)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Video generation routes
# ---------------------------------------------------------------------------

@app.post("/generate", response_model=GenerateResponse)
async def generate(
    request: Request,
    req: GenerateRequest,
    bg: BackgroundTasks,
    user: dict = Depends(require_subscription),
):
    """Accept text, queue a background job, and return immediately."""
    client_id = request.client.host if request.client else "unknown"
    rate_limit_check(client_id)

    text = req.text.strip()
    job_id = str(uuid.uuid4())
    await create_job(job_id, input_text=text, engine="heygen")

    bg.add_task(process_video_job, job_id, text, user.get("user_id"))
    logger.info(
        "Job %s queued for user %s (HeyGen)",
        job_id,
        user.get("user_id", client_id),
    )

    return GenerateResponse(job_id=job_id)


@app.get("/generate/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str, _user: dict = Depends(require_auth)):
    """Poll job status. Fetches provider status for in-progress jobs."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    status = job["status"]

    if status == "completed":
        return StatusResponse(status="completed", video_url=job.get("video_url"))
    if status == "failed":
        return StatusResponse(status="failed", error=job.get("error"))

    video_id = job.get("video_id")
    engine = (job.get("engine") or "heygen").lower()

    if video_id and status == "processing":
        if engine == "openai":
            legacy = (
                "This job used the legacy OpenAI video engine, which is no longer available. "
                "Please generate again — videos are now rendered with HeyGen only."
            )
            await update_job(job_id, status="failed", error=legacy)
            _evict_status_cache(video_id)
            return StatusResponse(status="failed", error=legacy)

        # ---------------------------------------------------------------
        # HeyGen timeout guard: fail jobs that have been processing too long
        # to prevent them hanging indefinitely if HeyGen never responds.
        # ---------------------------------------------------------------
        created_at = job.get("created_at")
        if created_at:
            try:
                job_age_minutes = (time.time() - float(created_at)) / 60
                if job_age_minutes > _HEYGEN_TIMEOUT_MINUTES:
                    error = f"HeyGen job timed out after {_HEYGEN_TIMEOUT_MINUTES} minutes"
                    logger.warning("Job %s timed out: %s", job_id, error)
                    await update_job(job_id, status="failed", error=error)
                    _evict_status_cache(video_id)
                    return StatusResponse(status="failed", error=error)
            except (TypeError, ValueError):
                pass

        provider_failed = ("failed", "error")
        provider_error_default = "HeyGen reported failure"

        try:
            result = await _get_cached_heygen_status(video_id)
            provider_status = result.get("status", "pending")
        except Exception as exc:
            error = f"HeyGen status check failed: {exc}"
            logger.error("Job %s polling failed: %s", job_id, error)
            await update_job(job_id, status="failed", error=error)
            _evict_status_cache(video_id)
            return StatusResponse(status="failed", error=error)

        if provider_status == "completed":
            url = result.get("video_url")
            if not url:
                error = "HeyGen completed the job but no video URL was returned."
                await update_job(job_id, status="failed", error=error)
                _evict_status_cache(video_id)
                return StatusResponse(status="failed", error=error)

            await update_job(job_id, status="completed", video_url=url)
            _evict_status_cache(video_id)
            return StatusResponse(status="completed", video_url=url)

        if provider_status in provider_failed:
            error = result.get("error", provider_error_default)
            await update_job(job_id, status="failed", error=error)
            _evict_status_cache(video_id)
            return StatusResponse(status="failed", error=error)

    return StatusResponse(status="pending")


@app.get("/generate/content/{job_id}")
async def get_generated_video_content(job_id: str):
    """Serve generated video bytes for providers that don't expose direct public URLs."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("status") != "completed":
        raise HTTPException(status_code=409, detail="Video is not ready yet")

    engine = (job.get("engine") or "heygen").lower()
    if engine == "openai":
        raise HTTPException(
            status_code=410,
            detail="OpenAI video content is no longer available; regenerate with HeyGen.",
        )

    video_url = job.get("video_url")
    if video_url:
        return RedirectResponse(url=video_url, status_code=307)
    raise HTTPException(status_code=404, detail="Video URL not found")


# ---------------------------------------------------------------------------
# Waitlist routes
# ---------------------------------------------------------------------------


@app.get("/waitlist")
async def waitlist_help():
    """GET is only for quick checks in the browser. Joining uses POST with JSON."""
    return {
        "service": "Strang API",
        "waitlist_join": "POST JSON { email, ref? } to this same path",
        "waitlist_count": "GET /waitlist/count",
        "health": "GET /health",
    }


@app.post("/waitlist", response_model=WaitlistResponse)
async def waitlist_join(req: WaitlistRequest, bg: BackgroundTasks):
    """Add email to waitlist. Idempotent. Supports referral tracking."""
    result = await add_email(req.email, referred_by_code=req.ref)

    total = await get_waitlist_count()
    base = config.LANDING_PAGE_URL_FOR_REFERRAL.rstrip("/")
    referral_link = f"{base}/?ref={result['referral_code']}" if result["referral_code"] else base

    if result["is_new"]:
        logger.info(
            "Waitlist signup: %s (position=%s, referred_by=%s)",
            req.email,
            result["position"],
            req.ref or "—",
        )
        bg.add_task(
            _notify_discord_waitlist,
            req.email,
            result["position"],
            total,
            True,
        )
        return WaitlistResponse(
            ok=True,
            message="You're on the list!",
            is_new=True,
            referral_code=result["referral_code"],
            position=result["position"],
            referral_count=result["referral_count"],
        )

    # Idempotent re-join: return existing data so the frontend can re-show state
    bg.add_task(
        _notify_discord_waitlist,
        req.email,
        result["position"],
        total,
        False,
    )
    return WaitlistResponse(
        ok=True,
        message="You're already on the list!",
        is_new=False,
        referral_code=result["referral_code"],
        position=result["position"],
        referral_count=result["referral_count"],
    )


@app.get("/waitlist/count", response_model=WaitlistCountResponse)
async def waitlist_count():
    """Return number of waitlist signups."""
    count = await get_waitlist_count()
    return WaitlistCountResponse(count=count)


@app.get("/waitlist/position", response_model=WaitlistPositionResponse)
async def waitlist_position(email: str):
    """Return queue position and referral stats for an existing waitlist entry."""
    entry = await get_waitlist_entry(email)
    if not entry:
        raise HTTPException(status_code=404, detail="Email not found on waitlist.")
    position = await get_waitlist_position(email)
    total = await get_waitlist_count()
    return WaitlistPositionResponse(
        position=position,
        referral_code=entry.get("referral_code") or "",
        referral_count=entry.get("referral_count") or 0,
        total=total,
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Basic health check; reports which integrations are configured."""
    return {
        "status": "ok",
        "openai_configured": bool(config.OPENAI_API_KEY.strip()),
        "heygen_configured": bool(config.HEYGEN_API_KEY.strip()),
        "auth_configured": bool(config.SUPABASE_JWT_SECRET),
        "stripe_configured": bool(config.STRIPE_SECRET_KEY),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)