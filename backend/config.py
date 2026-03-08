"""Centralized configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

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

# --- Stripe ---
STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID: str = os.environ.get("STRIPE_PRICE_ID", "")
LANDING_PAGE_URL: str = os.environ.get("LANDING_PAGE_URL", "http://localhost:5173")

# --- Free tier ---
FREE_TIER_VIDEO_LIMIT = int(os.environ.get("FREE_TIER_VIDEO_LIMIT", "3"))

# --- CORS ---
CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", "*").strip()
CORS_ORIGINS: list[str] = (
    [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()]
    if CORS_ORIGINS_RAW != "*"
    else ["*"]
)

# --- Model ---
OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4.1")
