"""HeyGen Video Agent integration: screenplay → video creation and status polling."""

import logging

import httpx
from fastapi import HTTPException
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

import config
from models.schemas import Screenplay

logger = logging.getLogger("strang.heygen")

HEYGEN_VIDEO_AGENT_URL = "https://api.heygen.com/v1/video_agent/generate"
HEYGEN_STATUS_URL = "https://api.heygen.com/v1/video_status.get"


def build_video_agent_prompt(screenplay: Screenplay) -> str:
    """Build a HeyGen-friendly prompt from the structured screenplay."""
    instructions = [
        "Create a short educational explainer video. Follow this script scene by scene.",
        "Style: illustrative only—no talking head, no on-screen presenter. "
        "Use only the described visuals with voice-over narration. "
        "Keep a clean, cinematic 3D/animation style where it fits.",
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
        scenes.append(f'Scene {i} ({v_type}): {visual} VO: "{vo}"')
    return "\n".join(instructions + scenes)


def _heygen_duration_sec(screenplay: Screenplay) -> int:
    """Suggest duration in seconds from scene count (HeyGen min 5)."""
    n = max(1, len(screenplay.scenes))
    return max(30, min(300, 45 * n))


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _call_heygen_create(payload: dict) -> httpx.Response:
    """HTTP call to HeyGen create with automatic retry on transport failures."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        return await client.post(
            HEYGEN_VIDEO_AGENT_URL,
            headers={"X-Api-Key": config.HEYGEN_API_KEY, "Content-Type": "application/json"},
            json=payload,
        )


async def heygen_create_video(screenplay: Screenplay) -> str:
    """Call HeyGen Video Agent. Returns video_id."""
    if not config.HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY is not set.")

    prompt = build_video_agent_prompt(screenplay)
    payload = {
        "prompt": prompt,
        "config": {
            "orientation": "landscape",
            "duration_sec": _heygen_duration_sec(screenplay),
        },
    }

    r = await _call_heygen_create(payload)

    if r.status_code != 200:
        err = r.text
        try:
            err = r.json().get("error", {}).get("message", err)
        except Exception:
            pass
        logger.error("HeyGen create returned %s: %s", r.status_code, err)
        raise HTTPException(status_code=502, detail=f"HeyGen Video Agent error: {err}")

    data = r.json()
    video_id = (
        data.get("data", {}).get("video_id")
        or data.get("video_id")
        or data.get("data", {}).get("id")
    )
    if not video_id:
        raise HTTPException(status_code=502, detail="HeyGen did not return video_id")

    logger.info("HeyGen video created: %s", video_id)
    return video_id


async def heygen_get_status(video_id: str) -> dict:
    """Poll HeyGen video status. Returns dict with status and optional video_url."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            HEYGEN_STATUS_URL,
            headers={"X-Api-Key": config.HEYGEN_API_KEY},
            params={"video_id": video_id},
        )
    if r.status_code != 200:
        return {"status": "error", "error": r.text}

    data = r.json()
    inner = data.get("data", data)
    status = (inner.get("status") or "").lower()
    url = inner.get("video_url") or inner.get("url") or inner.get("result_url")
    return {"status": status, "video_url": url, "raw": data}
