"""OpenAI Videos API integration for text-to-video generation and polling."""

import logging
import re

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

logger = logging.getLogger("strang.openai_video")

OPENAI_VIDEOS_URL = "https://api.openai.com/v1/videos"

# Hard cap on the number of extension segments per job to prevent runaway API costs.
MAX_EXTENSIONS = 4


def build_openai_video_prompt(screenplay: Screenplay) -> str:
    """Convert structured screenplay into a single OpenAI video prompt."""
    lines = [
        f"Create a detailed educational explainer video titled: {screenplay.project_title}.",
        (
            "Use cinematic illustrative visuals only. No presenter, no talking head, and no subtitles. "
            "Keep pacing clear enough for learning, with smooth visual continuity between scenes."
        ),
        (
            "Narration must be fully coherent, information-dense, and complete. "
            "Do not end abruptly or mid-sentence. Close with a complete final takeaway sentence."
        ),
        "",
    ]
    for i, scene in enumerate(screenplay.scenes, 1):
        lines.append(f"Scene {i} visual ({scene.visual_type}): {scene.visual_prompt}")
        lines.append(f"Scene {i} voiceover: {scene.voiceover}")
        lines.append("")
    return "\n".join(lines).strip()


def target_explainer_seconds(text: str) -> int:
    """Estimate explainer runtime from source text length (no fixed short cap)."""
    chars = max(1, len((text or "").strip()))
    # Rough pacing: ~12 seconds per ~320 characters, with a stronger floor for complete explanations.
    return max(36, ((chars + 319) // 320) * 12)


def estimate_initial_video_seconds(screenplay: Screenplay) -> int:
    """Choose a stronger initial segment length to reduce abrupt early cutoffs."""
    all_voiceover = " ".join((scene.voiceover or "").strip() for scene in screenplay.scenes)
    word_count = len(re.findall(r"\b\w+\b", all_voiceover))
    if word_count >= 150:
        return 20
    if word_count >= 90:
        return 16
    return 12


def choose_extension_segment_seconds(remaining_seconds: int) -> int:
    """Pick a valid OpenAI extension segment size."""
    for s in (20, 16, 12, 8, 4):
        if remaining_seconds >= s:
            return s
    return 4


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _openai_post_video(payload: dict) -> httpx.Response:
    async with httpx.AsyncClient(timeout=90.0) as client:
        return await client.post(
            OPENAI_VIDEOS_URL,
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json=payload,
        )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _openai_get_video(video_id: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.get(
            f"{OPENAI_VIDEOS_URL}/{video_id}",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
        )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _openai_extend_video(payload: dict) -> httpx.Response:
    async with httpx.AsyncClient(timeout=90.0) as client:
        return await client.post(
            f"{OPENAI_VIDEOS_URL}/extensions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json=payload,
        )


async def _extract_content_redirect(video_id: str) -> str | None:
    """Try to obtain a downloadable URL via /content redirect location."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
        r = await client.get(
            f"{OPENAI_VIDEOS_URL}/{video_id}/content",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
        )
    if r.status_code in (301, 302, 303, 307, 308):
        return r.headers.get("Location")
    return None


def _video_url_from_payload(data: dict) -> str | None:
    """Handle multiple response shapes for completed video assets."""
    candidates = [
        data.get("video_url"),
        data.get("url"),
        data.get("result_url"),
        data.get("output_url"),
    ]
    output = data.get("output")
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict):
                candidates.extend([
                    item.get("url"),
                    item.get("video_url"),
                ])
    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value
    return None


async def openai_create_video(screenplay: Screenplay) -> str:
    """Queue a video generation job in OpenAI. Returns video job id."""
    if not config.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    initial_seconds = estimate_initial_video_seconds(screenplay)
    payload = {
        "model": config.OPENAI_VIDEO_MODEL,
        "prompt": build_openai_video_prompt(screenplay),
        "seconds": str(initial_seconds),
        "size": config.OPENAI_VIDEO_SIZE,
    }
    r = await _openai_post_video(payload)
    if r.status_code not in (200, 201):
        err = r.text
        try:
            err = r.json().get("error", {}).get("message", err)
        except Exception:
            pass
        logger.error("OpenAI video create returned %s: %s", r.status_code, err)
        raise HTTPException(status_code=502, detail=f"OpenAI video error: {err}")

    data = r.json()
    video_id = data.get("id")
    if not video_id:
        raise HTTPException(status_code=502, detail="OpenAI video response missing id")
    logger.info("OpenAI video queued: %s", video_id)
    return video_id


async def openai_extend_video(video_id: str, prompt: str, seconds: int) -> str:
    """Create a continuation segment for a completed OpenAI video."""
    if not config.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    payload = {
        "prompt": prompt,
        "seconds": str(seconds),
        "video": {"id": video_id},
    }
    r = await _openai_extend_video(payload)
    if r.status_code not in (200, 201):
        err = r.text
        try:
            err = r.json().get("error", {}).get("message", err)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"OpenAI extension error: {err}")

    data = r.json()
    next_video_id = data.get("id")
    if not next_video_id:
        raise HTTPException(status_code=502, detail="OpenAI extension response missing id")
    logger.info("OpenAI extension queued: %s -> %s (+%ss)", video_id, next_video_id, seconds)
    return next_video_id


async def openai_get_status(video_id: str) -> dict:
    """Poll OpenAI video status and best-effort resolve a playable URL."""
    r = await _openai_get_video(video_id)
    if r.status_code != 200:
        return {"status": "error", "error": r.text}

    data = r.json()
    status = (data.get("status") or "").lower()
    try:
        stitched_seconds = int(str(data.get("seconds") or "0").strip())
    except ValueError:
        stitched_seconds = 0
    url = _video_url_from_payload(data)
    return {"status": status, "seconds": stitched_seconds, "video_url": url, "raw": data}


async def openai_get_content(video_id: str) -> tuple[str, bytes]:
    """Fetch final video bytes from OpenAI content endpoint."""
    if not config.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set.")

    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.get(
            f"{OPENAI_VIDEOS_URL}/{video_id}/content",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
        )
    if r.status_code != 200:
        err = r.text
        try:
            err = r.json().get("error", {}).get("message", err)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"OpenAI content error: {err}")

    content_type = r.headers.get("content-type") or "video/mp4"
    return content_type, r.content