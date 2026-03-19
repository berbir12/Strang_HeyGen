"""Pydantic models for API requests/responses and the screenplay schema."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class Scene(BaseModel):
    visual_type: str = Field(
        default="3D animation",
        description=(
            "Type of visual: e.g. '3D animation', 'diagram', 'B-roll', "
            "'motion graphics', 'cinematic illustration'."
        ),
    )
    visual_prompt: str = Field(
        ...,
        description="One or two concrete, filmable sentences describing exactly what we see on screen.",
    )
    voiceover: str = Field(
        ...,
        description="Exact narration for this scene (voice-over only, no on-screen presenter).",
    )


class Screenplay(BaseModel):
    project_title: str = Field(..., description="Short title for the video")
    scenes: list[Scene] = Field(..., min_length=1)
    elaborated_content: str | None = Field(None, description="Enhanced description from Step 1")


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    engine: Literal["openai", "heygen"] | None = Field(
        default=None,
        description="Preferred video engine. Optional; defaults to backend behavior.",
    )


class GenerateResponse(BaseModel):
    job_id: str
    message: str = "Video generation started. Poll /generate/status/{job_id} for result."


class StatusResponse(BaseModel):
    status: str  # pending | processing | completed | failed
    video_url: str | None = None
    error: str | None = None


class WaitlistRequest(BaseModel):
    email: EmailStr


class WaitlistResponse(BaseModel):
    ok: bool = True
    message: str = "You're on the list!"


class WaitlistCountResponse(BaseModel):
    count: int
