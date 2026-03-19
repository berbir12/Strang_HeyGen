"""SQLite persistence layer replacing JSON file storage.

Provides async CRUD for jobs, waitlist, and screenplay cache.
Uses aiosqlite (thin async wrapper around sqlite3).
"""

import json
import secrets
import string
import time

import aiosqlite

import config

_db_path = config.DB_PATH


def _generate_referral_code() -> str:
    """Generate an 8-character alphanumeric referral code."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _ensure_waitlist_referral_columns(db: aiosqlite.Connection) -> None:
    """Backfill schema for older databases by adding referral columns when missing."""
    cursor = await db.execute("PRAGMA table_info(waitlist)")
    cols = await cursor.fetchall()
    names = {c[1] for c in cols}
    if "referral_code" not in names:
        await db.execute(
            "ALTER TABLE waitlist ADD COLUMN referral_code TEXT"
        )
    if "referred_by" not in names:
        await db.execute(
            "ALTER TABLE waitlist ADD COLUMN referred_by TEXT"
        )
    if "referral_count" not in names:
        await db.execute(
            "ALTER TABLE waitlist ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0"
        )


async def _ensure_jobs_engine_column(db: aiosqlite.Connection) -> None:
    """Backfill schema for older databases by adding jobs.engine when missing."""
    cursor = await db.execute("PRAGMA table_info(jobs)")
    cols = await cursor.fetchall()
    names = {c[1] for c in cols}
    if "engine" not in names:
        await db.execute(
            "ALTER TABLE jobs ADD COLUMN engine TEXT NOT NULL DEFAULT 'heygen'"
        )


async def _ensure_jobs_extension_count_column(db: aiosqlite.Connection) -> None:
    """Backfill schema for older databases by adding jobs.extension_count when missing."""
    cursor = await db.execute("PRAGMA table_info(jobs)")
    cols = await cursor.fetchall()
    names = {c[1] for c in cols}
    if "extension_count" not in names:
        await db.execute(
            "ALTER TABLE jobs ADD COLUMN extension_count INTEGER NOT NULL DEFAULT 0"
        )


async def init_db() -> None:
    """Create tables if they don't exist. Called once at startup."""
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id           TEXT PRIMARY KEY,
                status       TEXT NOT NULL DEFAULT 'pending',
                engine       TEXT NOT NULL DEFAULT 'heygen',
                extension_count INTEGER NOT NULL DEFAULT 0,
                video_id     TEXT,
                video_url    TEXT,
                error        TEXT,
                input_text   TEXT,
                created_at   REAL NOT NULL,
                updated_at   REAL NOT NULL
            )
        """)
        await _ensure_jobs_engine_column(db)
        await _ensure_jobs_extension_count_column(db)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS waitlist (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
                referral_code  TEXT UNIQUE,
                referred_by    TEXT,
                referral_count INTEGER NOT NULL DEFAULT 0,
                created_at     REAL NOT NULL
            )
        """)
        await _ensure_waitlist_referral_columns(db)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS screenplay_cache (
                text_hash       TEXT PRIMARY KEY,
                screenplay_json TEXT NOT NULL,
                created_at      REAL NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id                  TEXT PRIMARY KEY,
                email               TEXT NOT NULL,
                stripe_customer_id  TEXT,
                subscription_status TEXT NOT NULL DEFAULT 'free',
                subscription_id     TEXT,
                plan                TEXT NOT NULL DEFAULT 'free',
                videos_generated    INTEGER NOT NULL DEFAULT 0,
                videos_limit        INTEGER NOT NULL DEFAULT 3,
                current_period_end  REAL,
                created_at          REAL NOT NULL,
                updated_at          REAL NOT NULL
            )
        """)
        await db.commit()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

async def create_job(job_id: str, input_text: str = "", engine: str = "heygen") -> dict:
    now = time.time()
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(
            "INSERT INTO jobs (id, status, engine, input_text, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (job_id, "pending", engine, input_text, now, now),
        )
        await db.commit()
    return {
        "id": job_id, "status": "pending",
        "engine": engine, "video_id": None, "video_url": None, "error": None,
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

async def get_waitlist_entry(email: str) -> dict | None:
    """Return a single waitlist row by email, or None."""
    async with aiosqlite.connect(str(_db_path)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM waitlist WHERE email = ? COLLATE NOCASE", (email.strip().lower(),)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_waitlist_position(email: str) -> int:
    """Return 1-based queue position ordered by referral_count DESC, created_at ASC."""
    async with aiosqlite.connect(str(_db_path)) as db:
        cursor = await db.execute(
            """
            SELECT pos FROM (
                SELECT email,
                       ROW_NUMBER() OVER (ORDER BY referral_count DESC, created_at ASC) AS pos
                FROM waitlist
            ) ranked
            WHERE email = ? COLLATE NOCASE
            """,
            (email.strip().lower(),),
        )
        row = await cursor.fetchone()
        return row[0] if row else 0


async def add_email(email: str, referred_by_code: str | None = None) -> dict:
    """Add email with optional referral code.

    Returns a dict:
      is_new        – True if this was a fresh signup
      referral_code – the user's own share code
      position      – 1-based queue position after insert
      referral_count – how many referrals this entry has so far
    """
    email_clean = email.strip().lower()

    # Return existing entry early (idempotent)
    existing = await get_waitlist_entry(email_clean)
    if existing:
        position = await get_waitlist_position(email_clean)
        return {
            "is_new": False,
            "referral_code": existing.get("referral_code") or "",
            "position": position,
            "referral_count": existing.get("referral_count") or 0,
        }

    referral_code = _generate_referral_code()
    now = time.time()

    async with aiosqlite.connect(str(_db_path)) as db:
        # Validate the referrer code and get their row id
        referrer_id: int | None = None
        if referred_by_code:
            cursor = await db.execute(
                "SELECT id FROM waitlist WHERE referral_code = ? COLLATE NOCASE",
                (referred_by_code,),
            )
            row = await cursor.fetchone()
            if row:
                referrer_id = row[0]

        try:
            await db.execute(
                "INSERT INTO waitlist (email, referral_code, referred_by, created_at) VALUES (?, ?, ?, ?)",
                (email_clean, referral_code, referred_by_code if referrer_id else None, now),
            )
        except aiosqlite.IntegrityError:
            # Rare race condition — fall back to existing entry
            await db.commit()
            existing = await get_waitlist_entry(email_clean)
            if existing:
                position = await get_waitlist_position(email_clean)
                return {
                    "is_new": False,
                    "referral_code": existing.get("referral_code") or "",
                    "position": position,
                    "referral_count": existing.get("referral_count") or 0,
                }
            return {"is_new": False, "referral_code": "", "position": 0, "referral_count": 0}

        # Credit the referrer
        if referrer_id:
            await db.execute(
                "UPDATE waitlist SET referral_count = referral_count + 1 WHERE id = ?",
                (referrer_id,),
            )

        await db.commit()

    position = await get_waitlist_position(email_clean)
    return {"is_new": True, "referral_code": referral_code, "position": position, "referral_count": 0}


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


# ---------------------------------------------------------------------------
# Users (linked to Supabase user ID)
# ---------------------------------------------------------------------------

async def get_user(user_id: str) -> dict | None:
    async with aiosqlite.connect(str(_db_path)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_stripe_customer(customer_id: str) -> dict | None:
    async with aiosqlite.connect(str(_db_path)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE stripe_customer_id = ?", (customer_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def create_user(user_id: str, email: str) -> dict:
    now = time.time()
    limit = config.FREE_TIER_VIDEO_LIMIT
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(
            "INSERT OR IGNORE INTO users "
            "(id, email, videos_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, limit, now, now),
        )
        await db.commit()
    return (await get_user(user_id))  # type: ignore[return-value]


async def update_user(user_id: str, **fields: object) -> None:
    if not fields:
        return
    fields["updated_at"] = time.time()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [user_id]
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
        await db.commit()


async def increment_videos_generated(user_id: str) -> None:
    async with aiosqlite.connect(str(_db_path)) as db:
        await db.execute(
            "UPDATE users SET videos_generated = videos_generated + 1, "
            "updated_at = ? WHERE id = ?",
            (time.time(), user_id),
        )
        await db.commit()
