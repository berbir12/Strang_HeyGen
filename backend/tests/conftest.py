"""Pytest fixtures: app with temp SQLite DB and env that disables API key."""

import tempfile
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def env_and_data_dir(monkeypatch):
    """Point storage at a temp dir and disable auth for tests."""
    tmp = Path(tempfile.mkdtemp())
    db_path = tmp / "test.db"

    monkeypatch.setattr("config.STRANG_API_KEY", "")
    monkeypatch.setattr("config.DB_PATH", db_path)

    import storage.database as db_module
    monkeypatch.setattr(db_module, "_db_path", db_path)

    yield tmp
