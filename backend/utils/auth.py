"""API key authentication dependency for FastAPI."""

from fastapi import HTTPException, Request

import config


async def require_api_key(request: Request) -> None:
    """If STRANG_API_KEY is set, require X-API-Key or Authorization: Bearer."""
    if not config.STRANG_API_KEY:
        return
    key = request.headers.get("X-API-Key") or None
    if not key and request.headers.get("Authorization", "").startswith("Bearer "):
        key = request.headers.get("Authorization", "")[7:].strip()
    if key != config.STRANG_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
