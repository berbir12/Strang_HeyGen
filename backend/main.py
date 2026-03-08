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
import uuid

from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from models.schemas import (
    GenerateRequest,
    GenerateResponse,
    Screenplay,
    StatusResponse,
    WaitlistCountResponse,
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
    increment_videos_generated,
    init_db,
    update_job,
)
from utils.auth import require_auth
from utils.rate_limit import rate_limit_check

logger = logging.getLogger("strang")


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

async def process_video_job(job_id: str, text: str, user_id: str | None = None) -> None:
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
        logger.info("HeyGen video queued for job %s (video_id=%s)", job_id, video_id)

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
    await create_job(job_id, input_text=text)

    bg.add_task(process_video_job, job_id, text, user.get("user_id"))
    logger.info("Job %s queued for user %s", job_id, user.get("user_id", client_id))

    return GenerateResponse(job_id=job_id)


@app.get("/generate/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str, _user: dict = Depends(require_auth)):
    """Poll job status. Fetches live HeyGen status for in-progress jobs."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    status = job["status"]

    if status == "completed":
        return StatusResponse(status="completed", video_url=job.get("video_url"))
    if status == "failed":
        return StatusResponse(status="failed", error=job.get("error"))

    video_id = job.get("video_id")
    if video_id and status == "processing":
        result = await heygen_get_status(video_id)
        heygen_status = result.get("status", "pending")

        if heygen_status == "completed":
            url = result.get("video_url")
            await update_job(job_id, status="completed", video_url=url)
            return StatusResponse(status="completed", video_url=url)
        if heygen_status in ("failed", "error"):
            error = result.get("error", "HeyGen reported failure")
            await update_job(job_id, status="failed", error=error)
            return StatusResponse(status="failed", error=error)

    return StatusResponse(status="pending")


# ---------------------------------------------------------------------------
# Waitlist routes
# ---------------------------------------------------------------------------

@app.post("/waitlist", response_model=WaitlistResponse)
async def waitlist_join(req: WaitlistRequest):
    """Add email to waitlist. Idempotent."""
    is_new = await add_email(req.email)
    if not is_new:
        return WaitlistResponse(ok=True, message="You're already on the list!")
    logger.info("Waitlist signup: %s", req.email)
    return WaitlistResponse()


@app.get("/waitlist/count", response_model=WaitlistCountResponse)
async def waitlist_count():
    """Return number of waitlist signups."""
    count = await get_waitlist_count()
    return WaitlistCountResponse(count=count)


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
