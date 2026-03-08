"""Authentication: Supabase JWT verification with legacy API key fallback.

Auth priority:
1. If SUPABASE_JWT_SECRET is set → verify Bearer token as Supabase JWT
2. If STRANG_API_KEY is set → accept X-API-Key or Bearer matching that key
3. If neither is configured → allow all requests (dev mode)
"""

import logging

import jwt
from fastapi import HTTPException, Request

import config

logger = logging.getLogger("strang.auth")


def _verify_supabase_jwt(token: str) -> dict:
    """Decode and verify a Supabase-issued JWT. Returns the payload."""
    return jwt.decode(
        token,
        config.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )


def _extract_bearer(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip() or None
    return None


async def require_auth(request: Request) -> dict:
    """FastAPI dependency: authenticate the caller.

    Returns a user-info dict with at least ``user_id`` and ``role``.
    ``role`` is ``"admin"`` for legacy API-key callers or ``"authenticated"``
    for Supabase users.
    """
    # Dev mode: nothing configured → allow everyone
    if not config.SUPABASE_JWT_SECRET and not config.STRANG_API_KEY:
        return {"user_id": "anonymous", "email": "dev@localhost", "role": "admin"}

    bearer = _extract_bearer(request)
    api_key = request.headers.get("X-API-Key")

    # Legacy static API key (X-API-Key header)
    if config.STRANG_API_KEY and api_key == config.STRANG_API_KEY:
        return {"user_id": "admin", "email": "admin", "role": "admin"}

    # Legacy static API key (Bearer header)
    if config.STRANG_API_KEY and bearer == config.STRANG_API_KEY:
        return {"user_id": "admin", "email": "admin", "role": "admin"}

    # Supabase JWT
    if config.SUPABASE_JWT_SECRET and bearer:
        try:
            payload = _verify_supabase_jwt(bearer)
            return {
                "user_id": payload["sub"],
                "email": payload.get("email", ""),
                "role": payload.get("role", "authenticated"),
            }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
        except jwt.InvalidTokenError as exc:
            logger.warning("Invalid JWT: %s", exc)

    raise HTTPException(status_code=401, detail="Authentication required")
