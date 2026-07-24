"""Tests for Strang API: health, waitlist, generate/status, auth (mocked)."""

import json
import asyncio

import aiosqlite
import httpx
import pytest
import respx
from fastapi import HTTPException
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


def test_auth_me_requires_token_when_supabase_url_configured(client: TestClient, monkeypatch):
    """When SUPABASE_URL is configured (JWKS mode), /auth/me still requires bearer auth."""
    monkeypatch.setattr("config.SUPABASE_URL", "https://demo.supabase.co")
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_auth_me_accepts_bearer_when_jwks_mode(client: TestClient, monkeypatch):
    """Bearer token should pass when verifier succeeds in JWKS mode."""
    import utils.auth as auth_module

    monkeypatch.setattr("config.SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setattr(
        auth_module,
        "_verify_supabase_jwt",
        lambda _token: {"sub": "user-123", "email": "user@example.com", "role": "authenticated"},
    )
    r = client.get("/auth/me", headers={"Authorization": "Bearer token-value"})
    assert r.status_code == 200
    assert r.json()["user_id"] == "user-123"


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


def test_new_user_gets_one_complete_trial(monkeypatch):
    """Free accounts receive one lifetime trial video."""
    import storage.database as db_module

    async def _run() -> None:
        await db_module.init_db()
        user = await db_module.create_user("trial-user", "student@example.com")
        assert user["videos_limit"] == 1
        assert user["videos_generated"] == 0

    asyncio.run(_run())


def test_paid_invoice_resets_usage_for_new_billing_period(monkeypatch):
    """Stripe invoice periods reset paid usage once, without repeat resets."""
    import services.stripe_service as stripe_module
    import storage.database as db_module

    async def _run() -> None:
        await db_module.init_db()
        await db_module.create_user("pro-user", "student@example.com")
        await db_module.update_user(
            "pro-user",
            stripe_customer_id="cus_test",
            plan="pro",
            subscription_status="active",
            videos_generated=7,
            videos_limit=20,
            current_period_start=1000,
            current_period_end=2000,
        )
        invoice = {
            "customer": "cus_test",
            "lines": {"data": [{"period": {"start": 2000, "end": 3000}}]},
        }
        await stripe_module._handle_invoice_paid(invoice)
        user = await db_module.get_user("pro-user")
        assert user["videos_generated"] == 0
        assert user["videos_limit"] == 20
        assert user["current_period_start"] == 2000
        assert user["current_period_end"] == 3000

        await db_module.update_user("pro-user", videos_generated=2)
        await stripe_module._handle_invoice_paid(invoice)
        user = await db_module.get_user("pro-user")
        assert user["videos_generated"] == 2

    asyncio.run(_run())


def test_paid_plan_limit_is_enforced(monkeypatch):
    """Active subscriptions cannot generate beyond their period allowance."""
    import storage.database as db_module

    async def _run() -> None:
        await db_module.init_db()
        await db_module.create_user("limited-pro", "student@example.com")
        await db_module.update_user(
            "limited-pro",
            plan="pro",
            subscription_status="active",
            videos_generated=20,
            videos_limit=20,
        )
        with pytest.raises(HTTPException) as exc:
            await main_module.require_subscription(
                None,
                {
                    "user_id": "limited-pro",
                    "email": "student@example.com",
                    "role": "authenticated",
                },
            )
        assert exc.value.status_code == 403
        assert "Monthly Pro" in exc.value.detail

    asyncio.run(_run())
