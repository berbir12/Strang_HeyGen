"""Deterministic Strang explainers using HeyGen Starfish TTS + Hyperframes Cloud."""

import base64
import html
import io
import json
import logging
import zipfile

import httpx
from fastapi import HTTPException
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

import config
from models.schemas import Screenplay

logger = logging.getLogger("strang.hyperframes")

HEYGEN_API_BASE = "https://api.heygen.com"
SPEECH_URL = f"{HEYGEN_API_BASE}/v3/voices/speech"
VOICES_URL = f"{HEYGEN_API_BASE}/v3/voices"
RENDERS_URL = f"{HEYGEN_API_BASE}/v3/hyperframes/renders"

_resolved_voice_id: str | None = None


def _headers() -> dict[str, str]:
    return {
        "X-Api-Key": config.HEYGEN_API_KEY,
        "Content-Type": "application/json",
    }


def _api_error(response: httpx.Response, operation: str) -> HTTPException:
    detail = response.text
    try:
        payload = response.json()
        error = payload.get("error")
        if isinstance(error, dict):
            detail = error.get("message") or detail
        elif error:
            detail = str(error)
    except Exception:
        pass
    return HTTPException(
        status_code=502,
        detail=f"HeyGen {operation} failed ({response.status_code}): {detail}",
    )


async def _get_voice_id(client: httpx.AsyncClient) -> str:
    """Use the configured Starfish voice, or resolve a stable public English voice."""
    global _resolved_voice_id
    configured = config.HEYGEN_TTS_VOICE_ID.strip()
    if configured:
        return configured
    if _resolved_voice_id:
        return _resolved_voice_id

    response = await client.get(
        VOICES_URL,
        headers={"X-Api-Key": config.HEYGEN_API_KEY},
        params={"engine": "starfish", "language": "English", "type": "public", "limit": 20},
    )
    if not response.is_success:
        raise _api_error(response, "voice lookup")
    voices = response.json().get("data") or []
    if not voices:
        raise HTTPException(
            status_code=502,
            detail=(
                "HeyGen returned no Starfish-compatible English voices. "
                "Set HEYGEN_TTS_VOICE_ID explicitly."
            ),
        )
    _resolved_voice_id = voices[0].get("voice_id")
    if not _resolved_voice_id:
        raise HTTPException(status_code=502, detail="HeyGen voice response had no voice_id.")
    return _resolved_voice_id


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _generate_scene_speech(
    client: httpx.AsyncClient,
    voice_id: str,
    text: str,
) -> dict:
    response = await client.post(
        SPEECH_URL,
        headers=_headers(),
        json={
            "text": text,
            "voice_id": voice_id,
            "input_type": "text",
            "speed": config.HEYGEN_TTS_SPEED,
            "locale": config.HEYGEN_TTS_LOCALE,
        },
    )
    if not response.is_success:
        raise _api_error(response, "text-to-speech")
    data = response.json().get("data") or {}
    audio_url = data.get("audio_url")
    duration = data.get("duration")
    if not audio_url or not duration:
        raise HTTPException(
            status_code=502,
            detail="HeyGen text-to-speech returned no audio URL or duration.",
        )
    return {"audio_url": audio_url, "duration": max(float(duration), 1.0)}


def _scene_markup(
    screenplay: Screenplay,
    speech: list[dict],
) -> tuple[str, float]:
    """Create timed HTML clips and matching audio tracks."""
    parts: list[str] = []
    cursor = 0.0
    scene_count = len(screenplay.scenes)

    for index, (scene, audio) in enumerate(zip(screenplay.scenes, speech, strict=True), 1):
        duration = float(audio["duration"]) + config.HYPERFRAMES_SCENE_PADDING_SEC
        start = cursor
        cursor += duration
        title = html.escape(screenplay.project_title)
        visual_type = html.escape(scene.visual_type or "Concept")
        visual = html.escape(scene.visual_prompt)
        voiceover = html.escape(scene.voiceover)
        audio_url = html.escape(audio["audio_url"], quote=True)
        takeaway = html.escape(screenplay.key_takeaway) if index == scene_count else ""

        parts.append(
            f"""
            <section class="scene clip" data-start="{start:.3f}" data-duration="{duration:.3f}"
                     data-track-index="0">
              <div class="grain"></div>
              <header>
                <div class="brand"><span></span>Strang</div>
                <div class="counter">{index:02d} / {scene_count:02d}</div>
              </header>
              <main>
                <p class="eyebrow">{visual_type}</p>
                <h1>{title}</h1>
                <div class="visual-card">
                  <div class="visual-mark">
                    <i></i><i></i><i></i><i></i><i></i>
                  </div>
                  <p>{visual}</p>
                </div>
                <p class="narration">{voiceover}</p>
                {f'<aside><b>Keep this:</b> {takeaway}</aside>' if takeaway else ''}
              </main>
              <footer><div style="width:{(index / scene_count) * 100:.2f}%"></div></footer>
            </section>
            <audio class="clip" data-start="{start:.3f}" data-duration="{duration:.3f}"
                   data-track-index="2" src="{audio_url}"></audio>
            """
        )
    return "\n".join(parts), cursor


def build_hyperframes_html(screenplay: Screenplay, speech: list[dict]) -> str:
    scenes, total_duration = _scene_markup(screenplay, speech)
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; width: 100%; height: 100%; overflow: hidden; background: #171614; }}
    body {{ color: #f4efe7; font-family: Arial, Helvetica, sans-serif; }}
    #stage {{ position: relative; width: 1920px; height: 1080px; background: #171614; }}
    .scene {{ position: absolute; inset: 0; padding: 58px 76px 44px; background:
      radial-gradient(circle at 80% 15%, rgba(228,103,72,.10), transparent 33%), #191815; }}
    .grain {{ position:absolute; inset:0; opacity:.035; background-image:
      repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 5px); }}
    header {{ position:relative; display:flex; justify-content:space-between; align-items:center;
      border-bottom:1px solid #45413a; padding-bottom:26px; font-size:24px; }}
    .brand {{ font-weight:700; letter-spacing:-.02em; }}
    .brand span {{ display:inline-block; width:14px; height:14px; border-radius:50%;
      margin-right:15px; background:#e46748; }}
    .counter {{ color:#aaa198; font-variant-numeric:tabular-nums; }}
    main {{ position:relative; width:100%; padding:72px 26px 0; }}
    .eyebrow {{ margin:0 0 20px; color:#e8977f; font-size:22px; text-transform:uppercase;
      letter-spacing:.09em; font-weight:700; }}
    h1 {{ width:75%; margin:0; font-family:Georgia, serif; font-size:78px; line-height:1.02;
      letter-spacing:-.045em; font-weight:500; }}
    .visual-card {{ display:grid; grid-template-columns:360px 1fr; align-items:center; gap:54px;
      margin-top:55px; min-height:330px; padding:42px 52px; border:1px solid #4b463e;
      border-radius:14px; background:#20221f; box-shadow:0 22px 70px rgba(0,0,0,.2); }}
    .visual-mark {{ height:220px; display:flex; align-items:flex-end; gap:18px;
      border-bottom:2px solid #5d574f; padding:20px; }}
    .visual-mark i {{ display:block; flex:1; background:#e46748; border-radius:5px 5px 0 0; }}
    .visual-mark i:nth-child(1) {{ height:35%; }} .visual-mark i:nth-child(2) {{ height:72%; }}
    .visual-mark i:nth-child(3) {{ height:48%; }} .visual-mark i:nth-child(4) {{ height:88%; }}
    .visual-mark i:nth-child(5) {{ height:61%; }}
    .visual-card p {{ margin:0; color:#eee8df; font-family:Georgia, serif; font-size:42px;
      line-height:1.24; }}
    .narration {{ margin:30px 4px 0; color:#b9b0a5; font-size:24px; line-height:1.4; }}
    aside {{ margin-top:24px; color:#e9e2d8; border-left:5px solid #e46748; padding:15px 22px;
      background:#24211e; font-size:26px; }}
    footer {{ position:absolute; left:76px; right:76px; bottom:40px; height:6px; background:#34312d; }}
    footer div {{ height:100%; background:#e46748; }}
  </style>
</head>
<body>
  <div id="stage" data-composition-id="strang-explainer" data-start="0"
       data-duration="{total_duration:.3f}" data-width="1920" data-height="1080">
    {scenes}
  </div>
</body>
</html>"""


def _zip_project(index_html: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("index.html", index_html)
    return buffer.getvalue()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def hyperframes_create_video(screenplay: Screenplay) -> str:
    """Generate scene narration and submit an in-memory Hyperframes project."""
    if not config.HEYGEN_API_KEY:
        raise HTTPException(status_code=500, detail="HEYGEN_API_KEY is not set.")

    async with httpx.AsyncClient(timeout=60.0) as client:
        voice_id = await _get_voice_id(client)
        speech = []
        for scene in screenplay.scenes:
            speech.append(await _generate_scene_speech(client, voice_id, scene.voiceover))

        project = _zip_project(build_hyperframes_html(screenplay, speech))
        payload = {
            "project": {
                "type": "base64",
                "media_type": "application/zip",
                "data": base64.b64encode(project).decode("ascii"),
            },
            "fps": config.HYPERFRAMES_FPS,
            "quality": config.HYPERFRAMES_QUALITY,
            "format": "mp4",
            "resolution": "1080p",
            "aspect_ratio": "16:9",
            "composition": "index.html",
            "title": screenplay.project_title,
        }
        response = await client.post(RENDERS_URL, headers=_headers(), json=payload)
        if not response.is_success:
            raise _api_error(response, "Hyperframes render submission")
        render_id = (response.json().get("data") or response.json()).get("render_id")
        if not render_id:
            raise HTTPException(status_code=502, detail="HeyGen returned no Hyperframes render_id.")
        logger.info("Hyperframes render submitted: %s", render_id)
        return render_id


async def hyperframes_get_status(render_id: str) -> dict:
    """Return Hyperframes status using the same shape as other providers."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{RENDERS_URL}/{render_id}",
            headers={"X-Api-Key": config.HEYGEN_API_KEY},
        )
    if not response.is_success:
        raise _api_error(response, "Hyperframes status check")
    data = response.json().get("data") or response.json()
    status = (data.get("status") or "queued").lower()
    return {
        "status": status,
        "video_url": data.get("video_url"),
        "error": data.get("failure_message"),
        "raw": data,
    }
