"""
Strang backend.
- Receives highlighted text from the Chrome extension; OpenAI → screenplay; HeyGen → video.
- Jobs persisted to jobs.json so restarts don't lose in-progress work.
- Rate limit on /generate to protect API costs.
- Waitlist: POST /waitlist stores emails (JSON file); GET /waitlist/count for landing page.
"""

import json
import os
import time
import uuid
from pathlib import Path
from collections import defaultdict

import httpx
from dotenv import load_dotenv

load_dotenv()
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field


async def require_api_key(request: Request) -> None:
    """If STRANG_API_KEY is set, require X-API-Key or Authorization: Bearer."""
    if not STRANG_API_KEY:
        return
    key = request.headers.get("X-API-Key") or None
    if not key and request.headers.get("Authorization", "").startswith("Bearer "):
        key = request.headers.get("Authorization", "")[7:].strip()
    if key != STRANG_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# -----------------------------------------------------------------------------
# Config (env vars)
# -----------------------------------------------------------------------------
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
HEYGEN_API_KEY = os.environ.get("HEYGEN_API_KEY", "")

# Waitlist & jobs: directory for JSON files
DATA_DIR = Path(os.environ.get("WAITLIST_DIR", os.path.dirname(os.path.abspath(__file__))))
WAITLIST_FILE = DATA_DIR / "waitlist.json"
JOBS_FILE = DATA_DIR / "jobs.json"

# Rate limit: max requests per window per client (IP or API key)
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "10"))
RATE_LIMIT_WINDOW_SEC = int(os.environ.get("RATE_LIMIT_WINDOW_SEC", "3600"))

# Optional API key: if set, /generate and /generate/status require X-API-Key or Authorization: Bearer <key>
STRANG_API_KEY = os.environ.get("STRANG_API_KEY", "").strip()

# CORS: comma-separated origins, or "*" for allow-all (default in dev)
CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", "*").strip()
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()] if CORS_ORIGINS_RAW != "*" else ["*"]

# In-memory job store (loaded/saved to JOBS_FILE)
JOBS: dict[str, dict] = {}

# Rate limit: client_id -> list of request timestamps (pruned by window)
_rate_limit_store: dict[str, list[float]] = defaultdict(list)

# -----------------------------------------------------------------------------
# Pydantic models (match Director schema) — illustration-only, no avatar
# -----------------------------------------------------------------------------


class Scene(BaseModel):
    visual_type: str = Field(
        default="3D animation",
        description="Type of visual: e.g. '3D animation', 'diagram', 'B-roll', 'motion graphics', 'cinematic illustration'.",
    )
    visual_prompt: str = Field(
        ...,
        description="One or two concrete, filmable sentences describing exactly what we see on screen.",
    )
    voiceover: str = Field(..., description="Exact narration for this scene (voice-over only, no on-screen presenter).")


class Screenplay(BaseModel):
    project_title: str = Field(..., description="Short title for the video")
    scenes: list[Scene] = Field(..., min_length=1)
    elaborated_content: str | None = Field(None, description="Enhanced description from Step 1")


# -----------------------------------------------------------------------------
# Director: OpenAI -> first elaborate the text, then create screenplay from it
# -----------------------------------------------------------------------------

DIRECTOR_SYSTEM = """You are an expert Director for short educational explainer videos. Your job is to turn the user's selected text into a clear, scene-by-scene screenplay that a video AI (HeyGen) will follow. The video is illustrative only: no talking head, no on-screen presenter—just visuals with voice-over.

**Step 1 — Elaborate and enhance the selected text**
Expand the raw text into a clear, detailed, educational description. Add context, define terms, and explain relationships so the content is ready for a high-quality explainer. This elaborated_content is your internal basis for the scenes. Keep it 2–4 paragraphs.

**Step 2 — Create the screenplay**
From the elaborated content, create a short screenplay. Each scene has:
- visual_type: one of "3D animation", "diagram", "B-roll", "motion graphics", "cinematic illustration". Pick what fits best (e.g. medical/science → 3D animation; processes → diagram; nature/history → B-roll).
- visual_prompt: 1–2 concrete, filmable sentences. Describe exactly what the viewer sees: subjects, actions, camera angle if helpful. Be specific (e.g. "A 3D heart model with a hole in the septum; blue and red streams show blood mixing between ventricles" not "something about the heart").
- voiceover: The exact narration for this scene (1–3 sentences). Match the visuals; the voice-over and image must align.

Output ONLY valid JSON matching this schema (no markdown, no code fence):
{
  "elaborated_content": "Your full elaborated description from Step 1.",
  "project_title": "Short title for the video (e.g. 'What Is VSD?')",
  "scenes": [
    {
      "visual_type": "3D animation",
      "visual_prompt": "Concrete, filmable description of what we see.",
      "voiceover": "Exact narration for this scene."
    }
  ]
}

Example (medical):
{
  "elaborated_content": "Ventricular septal defect (VSD) is...",
  "project_title": "What Is a Ventricular Septal Defect?",
  "scenes": [
    {
      "visual_type": "3D animation",
      "visual_prompt": "A 3D anatomical heart model; the septum between left and right ventricles has a visible hole; animated blue (oxygenated) and red (deoxygenated) blood streams show flow mixing through the defect.",
      "voiceover": "A ventricular septal defect is a hole in the wall that separates the heart's two lower chambers. Blood can flow through it and mix between the left and right sides."
    },
    {
      "visual_type": "3D animation",
      "visual_prompt": "Same heart model from the outside; subtle glow or highlight on the septum area; text label 'Septum' appears briefly.",
      "voiceover": "That wall is called the septum. When it doesn't close fully before birth, a VSD remains."
    }
  ]
}

Rules:
- elaborated_content must be the full enhanced text; do not skip it.
- visual_prompt must be specific and filmable. No vague phrases like "show the concept"—describe what is literally on screen.
- Keep 2–5 scenes. Order: intro/context → main idea(s) → recap or takeaway if needed.
- Return only the JSON object, no other text."""


async def get_screenplay(text: str) -> Screenplay:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set. Add it to your environment.",
        )
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Prefer o1-preview or gpt-4o for structured output
        model = "gpt-4o"
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": DIRECTOR_SYSTEM},
                    {"role": "user", "content": text},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
        )
    if resp.status_code != 200:
        err = resp.text
        try:
            err = resp.json().get("error", {}).get("message", err)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"OpenAI error: {err}")

    data = resp.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content") or "{}"
    raw = json.loads(content)
    return Screenplay.model_validate(raw)


# -----------------------------------------------------------------------------
# HeyGen Video Agent: illustrative video from prompt (no avatar), then poll status
# -----------------------------------------------------------------------------

HEYGEN_VIDEO_AGENT_URL = "https://api.heygen.com/v1/video_agent/generate"
HEYGEN_STATUS_URL = "https://api.heygen.com/v1/video_status.get"


def build_video_agent_prompt(screenplay: Screenplay) -> str:
    """Build a HeyGen-friendly prompt: full script with scene labels and VO per their prompting guide."""
    instructions = [
        "Create a short educational explainer video. Follow this script scene by scene.",
        "Style: illustrative only—no talking head, no on-screen presenter. Use only the described visuals with voice-over narration. Keep a clean, cinematic 3D/animation style where it fits.",
        f"Title: {screenplay.project_title}.",
        "",
        "---",
        "",
    ]
    scenes = []
    for i, s in enumerate(screenplay.scenes, 1):
        v_type = (s.visual_type or "3D animation").strip()
        visual = s.visual_prompt.strip()
        vo = s.voiceover.strip()
        # HeyGen format: "Scene label (visual type) Description. VO: \"narration\""
        scenes.append(
            f"Scene {i} ({v_type}): {visual} VO: \"{vo}\""
        )
    return "\n".join(instructions + scenes)


def _heygen_duration_sec(screenplay: Screenplay) -> int:
    """Suggest duration in seconds from scene count (HeyGen min 5)."""
    n = max(1, len(screenplay.scenes))
    sec = max(30, min(300, 45 * n))
    return sec


async def heygen_create_video(screenplay: Screenplay) -> str:
    """Call HeyGen Video Agent (illustrative video from prompt). Returns video_id."""
    if not HEYGEN_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="HEYGEN_API_KEY is not set.",
        )
    prompt = build_video_agent_prompt(screenplay)
    config = {
        "orientation": "landscape",
        "duration_sec": _heygen_duration_sec(screenplay),
    }
    payload = {"prompt": prompt, "config": config}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            HEYGEN_VIDEO_AGENT_URL,
            headers={"X-Api-Key": HEYGEN_API_KEY, "Content-Type": "application/json"},
            json=payload,
        )
    if r.status_code != 200:
        err = r.text
        try:
            err = r.json().get("error", {}).get("message", err)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"HeyGen Video Agent error: {err}")
    data = r.json()
    video_id = data.get("data", {}).get("video_id") or data.get("video_id") or data.get("data", {}).get("id")
    if not video_id:
        raise HTTPException(status_code=502, detail="HeyGen did not return video_id")
    return video_id


async def heygen_get_status(video_id: str) -> dict:
    """Poll HeyGen video status. Returns dict with status and optional video_url."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            HEYGEN_STATUS_URL,
            headers={"X-Api-Key": HEYGEN_API_KEY},
            params={"video_id": video_id},
        )
    if r.status_code != 200:
        return {"status": "error", "error": r.text}
    data = r.json()
    # Map HeyGen status to our status; they often use "completed" and "video_url" or "url"
    inner = data.get("data", data)
    status = (inner.get("status") or "").lower()
    url = inner.get("video_url") or inner.get("url") or inner.get("result_url")
    return {"status": status, "video_url": url, "raw": data}


# -----------------------------------------------------------------------------
# App and endpoints
# -----------------------------------------------------------------------------


def _load_jobs() -> None:
    """Load jobs from JOBS_FILE into JOBS."""
    JOBS.clear()
    if not JOBS_FILE.exists():
        return
    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for jid, job in (data.get("jobs") or {}).items():
            if isinstance(job, dict):
                JOBS[jid] = job
    except (json.JSONDecodeError, OSError):
        pass


def _save_jobs() -> None:
    """Persist JOBS to JOBS_FILE."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(JOBS_FILE, "w", encoding="utf-8") as f:
        json.dump({"jobs": JOBS}, f, indent=2)


def _rate_limit_check(client_id: str) -> None:
    """Raise 429 if client has exceeded rate limit (wall-clock window)."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SEC
    _rate_limit_store[client_id] = [t for t in _rate_limit_store[client_id] if t > window_start]
    if len(_rate_limit_store[client_id]) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {RATE_LIMIT_WINDOW_SEC // 60} minutes.",
        )
    _rate_limit_store[client_id].append(now)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_jobs()
    yield
    _save_jobs()
    JOBS.clear()


app = FastAPI(title="Strang API", version="1.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    """Ensure every error returns JSON so the extension never sees plain-text error bodies."""
    from fastapi.responses import JSONResponse
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    detail = str(exc) if str(exc) else "An unexpected error occurred"
    return JSONResponse(status_code=500, content={"detail": detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1)


class GenerateResponse(BaseModel):
    job_id: str
    message: str = "Video generation started. Poll /generate/status/{job_id} for result."


class StatusResponse(BaseModel):
    status: str  # pending | completed | failed
    video_url: str | None = None
    error: str | None = None


# -----------------------------------------------------------------------------
# Waitlist (JSON file storage)
# -----------------------------------------------------------------------------


def _load_waitlist() -> list[str]:
    """Load list of emails from waitlist.json. Returns [] if file missing or invalid."""
    if not WAITLIST_FILE.exists():
        return []
    try:
        with open(WAITLIST_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("emails") or [])
    except (json.JSONDecodeError, OSError):
        return []


def _save_waitlist(emails: list[str]) -> None:
    """Write emails to waitlist.json."""
    WAITLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(WAITLIST_FILE, "w", encoding="utf-8") as f:
        json.dump({"emails": emails}, f, indent=2)


class WaitlistRequest(BaseModel):
    email: EmailStr


class WaitlistResponse(BaseModel):
    ok: bool = True
    message: str = "You're on the list!"


class WaitlistCountResponse(BaseModel):
    count: int


@app.post("/waitlist", response_model=WaitlistResponse)
def waitlist_join(req: WaitlistRequest):
    """Add email to waitlist. Idempotent: same email is not duplicated."""
    emails = _load_waitlist()
    normalized = req.email.strip().lower()
    if normalized in [e.lower() for e in emails]:
        return WaitlistResponse(ok=True, message="You're already on the list!")
    emails.append(normalized)
    _save_waitlist(emails)
    return WaitlistResponse()


@app.get("/waitlist/count", response_model=WaitlistCountResponse)
def waitlist_count():
    """Return number of waitlist signups (for landing page)."""
    return WaitlistCountResponse(count=len(_load_waitlist()))


# -----------------------------------------------------------------------------
# Video generation
# -----------------------------------------------------------------------------


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: Request, req: GenerateRequest, _: None = Depends(require_api_key)):
    """Turn highlighted text into a screenplay and start HeyGen video generation."""
    client_id = request.client.host if request.client else "unknown"
    _rate_limit_check(client_id)

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "pending", "video_id": None, "video_url": None, "error": None}
    _save_jobs()

    try:
        screenplay = await get_screenplay(req.text)
        video_id = await heygen_create_video(screenplay)
        JOBS[job_id]["video_id"] = video_id
        JOBS[job_id]["status"] = "pending"
        _save_jobs()
        return GenerateResponse(job_id=job_id)
    except HTTPException:
        raise
    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)
        _save_jobs()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/generate/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str, _: None = Depends(require_api_key)):
    """Poll for job status. When HeyGen completes, status=completed and video_url is set."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == "completed":
        return StatusResponse(status="completed", video_url=job.get("video_url"))
    if job["status"] == "failed":
        return StatusResponse(status="failed", error=job.get("error"))

    video_id = job.get("video_id")
    if not video_id:
        return StatusResponse(status="pending")

    result = await heygen_get_status(video_id)
    status = result.get("status", "pending")
    if status == "completed":
        url = result.get("video_url")
        job["status"] = "completed"
        job["video_url"] = url
        _save_jobs()
        return StatusResponse(status="completed", video_url=url)
    if status in ("failed", "error"):
        job["status"] = "failed"
        job["error"] = result.get("error", "HeyGen reported failure")
        _save_jobs()
        return StatusResponse(status="failed", error=job["error"])
    return StatusResponse(status="pending")


@app.get("/health")
def health():
    """Basic health; includes whether API keys are configured (no keys sent)."""
    return {
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY.strip()),
        "heygen_configured": bool(HEYGEN_API_KEY.strip()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
