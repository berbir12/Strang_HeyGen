"""SQLite persistence layer replacing JSON file storage.

Provides async CRUD for jobs, waitlist, and screenplay cache.
Uses aiosqlite (thin async wrapper around sqlite3).
"""

import json
import time

import aiosqlite

import config

_db_path = config.DB_PATH


async def init_db() -> None:
    """Create tables if they don't exist. Called once at startup."""
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id           TEXT PRIMARY KEY,
                status       TEXT NOT NULL DEFAULT 'pending',
                video_id     TEXT,
                video_url    TEXT,
                error        TEXT,
                input_text   TEXT,
                created_at   REAL NOT NULL,
                updated_at   REAL NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS waitlist (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
                created_at REAL NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS screenplay_cache (
                text_hash       TEXT PRIMARY KEY,
                screenplay_json TEXT NOT NULL,
                created_at      REAL NOT NULL
            )
        """)
        await db.commit()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

async def create_job(job_id: str, input_text: str = "") -> dict:
    now = time.time()
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(
            "INSERT INTO jobs (id, status, input_text, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (job_id, "pending", input_text, now, now),
        )
        await db.commit()
    return {
        "id": job_id, "status": "pending",
        "video_id": None, "video_url": None, "error": None,
    }


async def get_job(job_id: str) -> dict | None:
    async with aiosqlite.connect(str(_db_path)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def update_job(job_id: str, **fields: object) -> None:
    if not fields:
        return
    fields["updated_at"] = time.time()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [job_id]
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(f"UPDATE jobs SET {set_clause} WHERE id = ?", values)
        await db.commit()


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------

async def add_email(email: str) -> bool:
    """Add email. Returns True if new, False if already present."""
    try:
        async with aiosqlite.connect(str(_db_path)) as db:
            await db.execute(
                "INSERT INTO waitlist (email, created_at) VALUES (?, ?)",
                (email.strip().lower(), time.time()),
            )
            await db.commit()
        return True
    except aiosqlite.IntegrityError:
        return False


async def get_waitlist_count() -> int:
    async with aiosqlite.connect(str(_db_path)) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM waitlist")
        row = await cursor.fetchone()
        return row[0] if row else 0


# ---------------------------------------------------------------------------
# Screenplay cache (hash → screenplay JSON, saves OpenAI cost)
# ---------------------------------------------------------------------------

async def get_cached_screenplay(text_hash: str) -> dict | None:
    async with aiosqlite.connect(str(_db_path)) as db:
        cursor = await db.execute(
            "SELECT screenplay_json FROM screenplay_cache WHERE text_hash = ?",
            (text_hash,),
        )
        row = await cursor.fetchone()
        return json.loads(row[0]) if row else None


async def cache_screenplay(text_hash: str, screenplay_json: str) -> None:
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(
            "INSERT OR REPLACE INTO screenplay_cache "
            "(text_hash, screenplay_json, created_at) VALUES (?, ?, ?)",
            (text_hash, screenplay_json, time.time()),
        )
        await db.commit()
