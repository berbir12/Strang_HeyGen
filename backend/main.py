"""
Strang backend — educational video generation API.

Architecture:
- FastAPI with BackgroundTasks: /generate returns immediately, work runs async.
- SQLite persistence (aiosqlite): jobs, waitlist, users, screenplay cache.
- Auth: Supabase JWT with legacy API-key fallback.
- Payments: Stripe Checkout + webhook for subscription lifecycle.
- Retry on transient failures (tenacity) for OpenAI & HeyGen calls.
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
from services.openai_video_service import (
    MAX_EXTENSIONS,
    choose_extension_segment_seconds,
    openai_create_video,
    openai_get_content,
    openai_get_status,
    openai_extend_video,
    target_explainer_seconds,
)
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
                    "footer": {"text": "strang.ai waitlist"},
                }
            ]
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(config.DISCORD_WEBHOOK_URL, json=payload)
    except Exception as exc:
        logger.warning("Discord notification failed: %s", exc)


# ---------------------------------------------------------------------------
# Provider status cache — avoids hammering OpenAI/HeyGen on every client poll
# TTL of 10 seconds is safe: short enough to feel responsive, long enough to
# collapse burst polls from a single job into one external request.
# ---------------------------------------------------------------------------
_status_cache: dict[str, tuple[float, dict]] = {}
_STATUS_CACHE_TTL = 10  # seconds

# HeyGen jobs that stay in "processing" beyond this threshold are force-failed.
_HEYGEN_TIMEOUT_MINUTES = 15


async def _get_cached_provider_status(video_id: str, engine: str) -> dict:
    """Return cached provider status if fresh, otherwise fetch and cache it."""
    now = time.monotonic()
    cached = _status_cache.get(video_id)
    if cached:
        ts, result = cached
        if now - ts < _STATUS_CACHE_TTL:
            return result

    if engine == "openai":
        result = await openai_get_status(video_id)
    else:
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
    engine: str = "heygen",
    user_id: str | None = None,
) -> None:
    """Background task: OpenAI screenplay -> selected video engine creation."""
    try:
        selected_engine = engine if engine in ("heygen", "openai") else "heygen"
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        cached = await get_cached_screenplay(text_hash)

        if cached:
            screenplay = Screenplay.model_validate(cached)
            logger.info("Cache hit for job %s", job_id)
        else:
            screenplay = await get_screenplay(text)
            await cache_screenplay(text_hash, screenplay.model_dump_json())
            logger.info("Screenplay generated for job %s", job_id)

        if selected_engine == "openai":
            video_id = await openai_create_video(screenplay)
        else:
            video_id = await heygen_create_video(screenplay)
        await update_job(job_id, video_id=video_id, status="processing")
        logger.info(
            "%s video queued for job %s (video_id=%s)",
            selected_engine.capitalize(),
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
    logger.info("Strang API started")
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
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
    engine = (req.engine or "heygen").strip().lower()
    await create_job(job_id, input_text=text, engine=engine)

    bg.add_task(process_video_job, job_id, text, engine, user.get("user_id"))
    logger.info(
        "Job %s queued for user %s using engine=%s",
        job_id,
        user.get("user_id", client_id),
        engine,
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
        # ---------------------------------------------------------------
        # HeyGen timeout guard: fail jobs that have been processing too long
        # to prevent them hanging indefinitely if HeyGen never responds.
        # ---------------------------------------------------------------
        if engine == "heygen":
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

        if engine == "openai":
            provider_name = "OpenAI"
            provider_failed = ("failed", "error")
            provider_error_default = "OpenAI reported failure"
        else:
            provider_name = "HeyGen"
            provider_failed = ("failed", "error")
            provider_error_default = "HeyGen reported failure"

        try:
            result = await _get_cached_provider_status(video_id, engine)
            provider_status = result.get("status", "pending")
        except Exception as exc:
            error = f"{provider_name} status check failed: {exc}"
            logger.error("Job %s polling failed: %s", job_id, error)
            await update_job(job_id, status="failed", error=error)
            _evict_status_cache(video_id)
            return StatusResponse(status="failed", error=error)

        if provider_status == "completed":
            if engine == "openai":
                current_seconds = int(result.get("seconds") or 0)
                desired_seconds = target_explainer_seconds(job.get("input_text") or "")
                extension_count = int(job.get("extension_count") or 0)

                # Extend only if we're short AND haven't hit the cost cap.
                if (
                    current_seconds > 0
                    and current_seconds < desired_seconds
                    and extension_count < MAX_EXTENSIONS
                ):
                    extra = choose_extension_segment_seconds(desired_seconds - current_seconds)
                    continuation_prompt = (
                        "Continue this educational explainer in the same visual style and pacing. "
                        "Add meaningful depth, examples, and causal explanation so the topic is fully understood. "
                        "Ensure narration remains coherent and ends with a complete concluding sentence. "
                        f"Topic/context to continue: {job.get('input_text') or ''}"
                    )
                    next_video_id = await openai_extend_video(video_id, continuation_prompt, extra)
                    # Persist new video_id and increment extension counter so the
                    # cap survives server restarts.
                    await update_job(
                        job_id,
                        status="processing",
                        video_id=next_video_id,
                        extension_count=extension_count + 1,
                    )
                    _evict_status_cache(video_id)
                    return StatusResponse(status="pending")

                if extension_count >= MAX_EXTENSIONS:
                    logger.info(
                        "Job %s reached MAX_EXTENSIONS (%d); accepting current length (%ds)",
                        job_id,
                        MAX_EXTENSIONS,
                        current_seconds,
                    )

            url = result.get("video_url")
            if not url:
                if engine == "openai":
                    url = f"{config.PUBLIC_API_BASE_URL.rstrip('/')}/generate/content/{job_id}"
                else:
                    error = f"{provider_name} completed the job but no video URL was returned."
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
        video_id = job.get("video_id")
        if not video_id:
            raise HTTPException(status_code=500, detail="Missing OpenAI video id")
        media_type, content = await openai_get_content(video_id)
        return Response(content=content, media_type=media_type)

    video_url = job.get("video_url")
    if video_url:
        return RedirectResponse(url=video_url, status_code=307)
    raise HTTPException(status_code=404, detail="Video URL not found")


# ---------------------------------------------------------------------------
# Waitlist routes
# ---------------------------------------------------------------------------

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