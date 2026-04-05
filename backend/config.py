"""Centralized configuration loaded from environment variables."""

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()


def _origin_from_public_url(url: str) -> str | None:
    """Return Origin-style string (scheme://host[:port]) or None."""
    u = (url or "").strip()
    if not u:
        return None
    p = urlparse(u)
    if not p.scheme or not p.netloc:
        return None
    host = p.netloc.split("@")[-1]
    return f"{p.scheme}://{host}"


def _normalize_cors_entry(entry: str) -> str:
    """Strip whitespace and trailing slash from an origin (not for chrome-extension)."""
    e = entry.strip().rstrip("/")
    return e


def _build_cors_allowlist(landing_url: str, landing_for_referral: str) -> tuple[str, list[str]]:
    """Env CORS_ORIGINS plus resolved landing URL(s), www/apex variants, deduped.

    Must use the same resolved ``LANDING_PAGE_URL`` / ``LANDING_PAGE_URL_FOR_REFERRAL``
    as the rest of the app (not raw ``os.environ``), or localhost-only Railway env
    skips ``https://www.thestrang.com`` and browsers get no ACAO header.
    """
    raw = os.environ.get("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return raw, ["*"]

    seen: set[str] = set()
    out: list[str] = []

    def add(o: str) -> None:
        o = _normalize_cors_entry(o)
        if not o or o in seen:
            return
        seen.add(o)
        out.append(o)

    for part in raw.split(","):
        if part.strip():
            add(part.strip())

    for base in (landing_url, landing_for_referral):
        o = _origin_from_public_url(base)
        if o:
            add(o)
            if "://www." in o:
                add(o.replace("://www.", "://", 1))
            elif "://" in o:
                rest = o.split("://", 1)[1]
                if not rest.lower().startswith("www."):
                    add(o.replace("://", "://www.", 1))

    return raw, out

# --- API Keys ---
OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
HEYGEN_API_KEY: str = os.environ.get("HEYGEN_API_KEY", "")

# --- Storage ---
DATA_DIR = Path(os.environ.get("DATA_DIR", os.path.dirname(os.path.abspath(__file__))))
DB_PATH = DATA_DIR / "strang.db"

# --- Rate limiting ---
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "10"))
RATE_LIMIT_WINDOW_SEC = int(os.environ.get("RATE_LIMIT_WINDOW_SEC", "3600"))

# --- Auth (legacy static key + Supabase JWT) ---
STRANG_API_KEY: str = os.environ.get("STRANG_API_KEY", "").strip()
SUPABASE_JWT_SECRET: str = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "").strip()

# --- Stripe ---
STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID: str = os.environ.get("STRIPE_PRICE_ID", "")
LANDING_PAGE_URL: str = os.environ.get("LANDING_PAGE_URL", "http://localhost:5173").strip()
PUBLIC_API_BASE_URL: str = os.environ.get("PUBLIC_API_BASE_URL", "http://localhost:8000")

# --- Notifications ---
DISCORD_WEBHOOK_URL: str = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()

# --- Waitlist ---
# Referral links + CORS expansion must not inherit localhost from LANDING_PAGE_URL when
# the API runs on Railway but LANDING_PAGE_URL was left as dev. Otherwise production
# origins (e.g. https://www.thestrang.com) never get CORS headers and preflight fails.
_DEFAULT_PUBLIC_LANDING: str = "https://www.thestrang.com"
LANDING_PAGE_URL_FOR_REFERRAL: str = (
    os.environ.get("LANDING_PAGE_URL_FOR_REFERRAL", "").strip()
    or (
        _DEFAULT_PUBLIC_LANDING
        if (
            "localhost" in LANDING_PAGE_URL.lower()
            or "127.0.0.1" in LANDING_PAGE_URL
        )
        else LANDING_PAGE_URL
    )
)

# --- Free tier ---
FREE_TIER_VIDEO_LIMIT = int(os.environ.get("FREE_TIER_VIDEO_LIMIT", "3"))

# --- CORS ---
CORS_ORIGINS_RAW, CORS_ORIGINS = _build_cors_allowlist(
    LANDING_PAGE_URL,
    LANDING_PAGE_URL_FOR_REFERRAL,
)

# --- Model ---
OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4.1")
