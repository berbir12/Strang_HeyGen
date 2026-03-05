"""In-memory rate limiter.

Fine for single-process MVP. For production with multiple workers,
replace with Redis-backed rate limiting (e.g. slowapi + redis, or a
token-bucket in Redis).
"""

import time
from collections import defaultdict

from fastapi import HTTPException

import config

_store: dict[str, list[float]] = defaultdict(list)


def rate_limit_check(client_id: str) -> None:
    """Raise 429 if *client_id* exceeded the configured request window."""
    now = time.time()
    window_start = now - config.RATE_LIMIT_WINDOW_SEC
    _store[client_id] = [t for t in _store[client_id] if t > window_start]
    if len(_store[client_id]) >= config.RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {config.RATE_LIMIT_WINDOW_SEC // 60} minutes.",
        )
    _store[client_id].append(now)
