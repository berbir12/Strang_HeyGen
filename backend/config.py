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

# --- Auth ---
STRANG_API_KEY: str = os.environ.get("STRANG_API_KEY", "").strip()

# --- CORS ---
CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", "*").strip()
CORS_ORIGINS: list[str] = (
    [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()]
    if CORS_ORIGINS_RAW != "*"
    else ["*"]
)

# --- Model ---
OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gpt-4.1")
