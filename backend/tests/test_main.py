"""Tests for Strang API: health, waitlist, generate/status, auth (mocked)."""

import json

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
