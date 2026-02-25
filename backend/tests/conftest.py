"""Pytest fixtures: app with temp data dir and env that disables API key."""
import os
import tempfile
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def env_and_data_dir(monkeypatch):
    """Use temp dir for waitlist/jobs and no API key so tests don't need auth."""
    tmp = Path(tempfile.mkdtemp())
    monkeypatch.setenv("WAITLIST_DIR", str(tmp))
    monkeypatch.setenv("STRANG_API_KEY", "")
    # Patch main module so it uses this dir (module already imported with original env)
    import main as main_module
    monkeypatch.setattr(main_module, "DATA_DIR", tmp)
    monkeypatch.setattr(main_module, "WAITLIST_FILE", tmp / "waitlist.json")
    monkeypatch.setattr(main_module, "JOBS_FILE", tmp / "jobs.json")
    yield tmp
