"""Contract tests for the Starfish TTS + Hyperframes Cloud pipeline."""

import base64
import asyncio
import io
import zipfile

import httpx
import respx

from models.schemas import Scene, Screenplay
from services import hyperframes_service


def _screenplay() -> Screenplay:
    return Screenplay(
        project_title="How cells make energy",
        key_takeaway="Cells turn stored chemical energy into usable ATP.",
        scenes=[
            Scene(
                visual_type="diagram",
                visual_prompt="A labeled cell with the mitochondrion highlighted.",
                voiceover="Cells need a usable form of energy.",
            ),
            Scene(
                visual_type="motion graphics",
                visual_prompt="Energy flows from glucose into ATP molecules.",
                voiceover="Mitochondria convert energy from glucose into ATP.",
            ),
        ],
    )


@respx.mock
def test_hyperframes_pipeline_uses_scene_tts_and_in_memory_zip(monkeypatch):
    monkeypatch.setattr("config.HEYGEN_API_KEY", "hg-test")
    monkeypatch.setattr("config.HEYGEN_TTS_VOICE_ID", "")
    monkeypatch.setattr(hyperframes_service, "_resolved_voice_id", None)

    respx.get("https://api.heygen.com/v3/voices").mock(
        return_value=httpx.Response(
            200,
            json={"data": [{"voice_id": "voice-starfish"}], "has_more": False},
        )
    )
    speech_route = respx.post("https://api.heygen.com/v3/voices/speech").mock(
        side_effect=[
            httpx.Response(
                200,
                json={"data": {"audio_url": "https://cdn.test/scene-1.mp3", "duration": 3.2}},
            ),
            httpx.Response(
                200,
                json={"data": {"audio_url": "https://cdn.test/scene-2.mp3", "duration": 4.1}},
            ),
        ]
    )
    render_route = respx.post("https://api.heygen.com/v3/hyperframes/renders").mock(
        return_value=httpx.Response(200, json={"data": {"render_id": "hfr-123"}})
    )

    render_id = asyncio.run(hyperframes_service.hyperframes_create_video(_screenplay()))

    assert render_id == "hfr-123"
    assert speech_route.call_count == 2
    payload = render_route.calls[0].request.content
    import json

    body = json.loads(payload)
    assert body["project"]["type"] == "base64"
    assert body["composition"] == "index.html"
    project_bytes = base64.b64decode(body["project"]["data"])
    with zipfile.ZipFile(io.BytesIO(project_bytes)) as archive:
        markup = archive.read("index.html").decode()
    assert "How cells make energy" in markup
    assert "https://cdn.test/scene-1.mp3" in markup
    assert 'data-composition-id="strang-explainer"' in markup


@respx.mock
def test_hyperframes_status_maps_completed_render(monkeypatch):
    monkeypatch.setattr("config.HEYGEN_API_KEY", "hg-test")
    respx.get("https://api.heygen.com/v3/hyperframes/renders/hfr-123").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": {
                    "render_id": "hfr-123",
                    "status": "completed",
                    "video_url": "https://cdn.test/final.mp4",
                }
            },
        )
    )

    result = asyncio.run(hyperframes_service.hyperframes_get_status("hfr-123"))

    assert result["status"] == "completed"
    assert result["video_url"] == "https://cdn.test/final.mp4"
