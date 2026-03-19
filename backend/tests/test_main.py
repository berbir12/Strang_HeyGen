"""Tests for Strang API: health, waitlist, generate/status, auth (mocked)."""

import json
import asyncio

import aiosqlite
import httpx
import pytest
import respx
from fastapi.testclient import TestClient

import main as main_module


@pytest.fixture
def client():
    with TestClient(main_module.app) as c:
        yield c


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "openai_configured" in data
    assert "heygen_configured" in data
    assert "auth_configured" in data
    assert "stripe_configured" in data


def test_waitlist_join_and_count(client: TestClient):
    r = client.post("/waitlist", json={"email": "test@example.com"})
    assert r.status_code == 200
    assert r.json().get("ok") is True

    r2 = client.get("/waitlist/count")
    assert r2.status_code == 200
    assert r2.json()["count"] == 1

    r3 = client.post("/waitlist", json={"email": "test@example.com"})
    assert r3.status_code == 200
    r4 = client.get("/waitlist/count")
    assert r4.json()["count"] == 1


def test_waitlist_invalid_email(client: TestClient):
    r = client.post("/waitlist", json={"email": "not-an-email"})
    assert r.status_code == 422


@respx.mock
def test_generate_returns_job_id(client: TestClient, monkeypatch):
    """Mock OpenAI and HeyGen so /generate returns a job_id immediately."""
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": json.dumps({
                "project_title": "Test",
                "elaborated_content": "Test content.",
                "scenes": [{"visual_prompt": "A heart.", "voiceover": "This is a heart."}],
            })}}]
        })
    )
    respx.post("https://api.heygen.com/v1/video_agent/generate").mock(
        return_value=httpx.Response(200, json={"data": {"video_id": "vid-123"}})
    )
    respx.get("https://api.heygen.com/v1/video_status.get").mock(
        return_value=httpx.Response(200, json={"data": {"status": "pending"}})
    )

    monkeypatch.setattr("config.OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("config.HEYGEN_API_KEY", "hg-test")
    r = client.post("/generate", json={"text": "VSD is a heart defect."})

    assert r.status_code == 200
    data = r.json()
    assert "job_id" in data


@respx.mock
def test_generate_openai_engine_polls_openai_status(client: TestClient, monkeypatch):
    """When engine=openai, status polling should use OpenAI video API path."""
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": json.dumps({
                "project_title": "OpenAI Test",
                "elaborated_content": "Test content.",
                "scenes": [{"visual_prompt": "A cell divides.", "voiceover": "Cell division occurs."}],
            })}}]
        })
    )
    respx.post("https://api.openai.com/v1/videos").mock(
        return_value=httpx.Response(200, json={"id": "video_openai_1", "status": "queued"})
    )
    respx.get("https://api.openai.com/v1/videos/video_openai_1").mock(
        return_value=httpx.Response(200, json={
            "id": "video_openai_1",
            "status": "completed",
            "video_url": "https://cdn.example.com/openai-video.mp4",
        })
    )
    monkeypatch.setattr("config.OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("config.HEYGEN_API_KEY", "")

    r = client.post("/generate", json={"text": "Mitosis basics.", "engine": "openai"})
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    status = client.get(f"/generate/status/{job_id}")
    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["video_url"] == "https://cdn.example.com/openai-video.mp4"


@respx.mock
def test_generate_openai_engine_falls_back_to_content_proxy_url(client: TestClient, monkeypatch):
    """If OpenAI returns completed with no direct URL, API should return proxy content URL."""
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": json.dumps({
                "project_title": "OpenAI Proxy Test",
                "elaborated_content": "Test content.",
                "scenes": [{"visual_prompt": "A neuron fires.", "voiceover": "Signals move quickly."}],
            })}}]
        })
    )
    respx.post("https://api.openai.com/v1/videos").mock(
        return_value=httpx.Response(200, json={"id": "video_openai_2", "status": "queued"})
    )
    respx.get("https://api.openai.com/v1/videos/video_openai_2").mock(
        return_value=httpx.Response(200, json={
            "id": "video_openai_2",
            "status": "completed",
        })
    )
    respx.get("https://api.openai.com/v1/videos/video_openai_2/content").mock(
        return_value=httpx.Response(200, content=b"fake-mp4", headers={"content-type": "video/mp4"})
    )
    monkeypatch.setattr("config.OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("config.HEYGEN_API_KEY", "")
    monkeypatch.setattr("config.PUBLIC_API_BASE_URL", "http://localhost:8000")

    r = client.post("/generate", json={"text": "Neuron firing.", "engine": "openai"})
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    status = client.get(f"/generate/status/{job_id}")
    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["video_url"] == f"http://localhost:8000/generate/content/{job_id}"

    content = client.get(f"/generate/content/{job_id}")
    assert content.status_code == 200
    assert content.headers["content-type"].startswith("video/mp4")
    assert content.content == b"fake-mp4"


@respx.mock
def test_generate_openai_engine_auto_extends_until_target(client: TestClient, monkeypatch):
    """OpenAI flow should auto-extend short completed clips for explainer length."""
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": json.dumps({
                "project_title": "Auto Extend",
                "elaborated_content": "Detailed content.",
                "scenes": [{"visual_prompt": "A long process.", "voiceover": "Step by step explanation."}],
            })}}]
        })
    )
    respx.post("https://api.openai.com/v1/videos").mock(
        return_value=httpx.Response(200, json={"id": "video_openai_3", "status": "queued"})
    )
    respx.post("https://api.openai.com/v1/videos/extensions").mock(
        return_value=httpx.Response(200, json={"id": "video_openai_3_ext", "status": "queued"})
    )
    # First status call completes but is too short (4s), second status call is long enough.
    route = respx.get("https://api.openai.com/v1/videos/video_openai_3")
    route.side_effect = [
        httpx.Response(200, json={"id": "video_openai_3", "status": "completed", "seconds": "4"}),
    ]
    respx.get("https://api.openai.com/v1/videos/video_openai_3_ext").mock(
        return_value=httpx.Response(200, json={
            "id": "video_openai_3_ext",
            "status": "completed",
            "seconds": "84",
            "video_url": "https://cdn.example.com/openai-extended.mp4",
        })
    )
    monkeypatch.setattr("config.OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr("config.HEYGEN_API_KEY", "")

    # Long text drives the desired target seconds above 4s.
    long_text = "heart function " * 120
    r = client.post("/generate", json={"text": long_text, "engine": "openai"})
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    first_poll = client.get(f"/generate/status/{job_id}")
    assert first_poll.status_code == 200
    assert first_poll.json()["status"] == "pending"

    second_poll = client.get(f"/generate/status/{job_id}")
    assert second_poll.status_code == 200
    body = second_poll.json()
    assert body["status"] == "completed"
    assert body["video_url"] == "https://cdn.example.com/openai-extended.mp4"


def test_generate_no_keys_returns_job(client: TestClient, monkeypatch):
    """With empty keys, generate still returns 200 (background task handles the failure)."""
    monkeypatch.setattr("config.OPENAI_API_KEY", "")
    monkeypatch.setattr("config.HEYGEN_API_KEY", "")
    r = client.post("/generate", json={"text": "Hello"})
    assert r.status_code == 200
    assert "job_id" in r.json()


def test_generate_text_too_long(client: TestClient):
    r = client.post("/generate", json={"text": "x" * 5001})
    assert r.status_code == 422


def test_status_404(client: TestClient):
    r = client.get("/generate/status/nonexistent-job-id")
    assert r.status_code == 404


def test_auth_me_dev_mode(client: TestClient):
    """In dev mode (no auth configured), /auth/me returns anonymous user."""
    r = client.get("/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert data["user_id"] == "anonymous"
    assert data["plan"] == "pro"


def test_auth_me_requires_token_when_configured(client: TestClient, monkeypatch):
    """When Supabase JWT is configured, /auth/me requires a valid token."""
    monkeypatch.setattr("config.SUPABASE_JWT_SECRET", "test-secret-at-least-32-chars-long!")
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_init_db_migrates_jobs_extension_count_column(monkeypatch):
    """Older jobs tables should be migrated to include extension_count."""
    import storage.database as db_module

    db_path = db_module._db_path
    async def _run() -> None:
        async with aiosqlite.connect(str(db_path)) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id         TEXT PRIMARY KEY,
                    status     TEXT NOT NULL DEFAULT 'pending',
                    video_id   TEXT,
                    video_url  TEXT,
                    error      TEXT,
                    input_text TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
            await db.commit()

        await db_module.init_db()

        async with aiosqlite.connect(str(db_path)) as db:
            cursor = await db.execute("PRAGMA table_info(jobs)")
            cols = await cursor.fetchall()
            col_names = {c[1] for c in cols}
            assert "extension_count" in col_names

    asyncio.run(_run())
