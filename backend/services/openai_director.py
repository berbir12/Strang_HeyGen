"""OpenAI integration: highlighted text → structured screenplay via the Director prompt."""

import json
import logging

import httpx
from fastapi import HTTPException
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

import config
from models.schemas import Screenplay

logger = logging.getLogger("strang.openai")

DIRECTOR_SYSTEM = """\
You are an expert Director for short educational explainer videos. Your job is \
to turn the user's selected text into a clear, scene-by-scene screenplay that a \
video AI (HeyGen) will follow. The video is illustrative only: no talking head, \
no on-screen presenter—just visuals with voice-over.

**Step 1 — Elaborate and enhance the selected text**
Expand the raw text into a clear, detailed, educational description. Add context, \
define terms, and explain relationships so the content is ready for a high-quality \
explainer. This elaborated_content is your internal basis for the scenes. Keep it \
2–4 paragraphs.

**Step 2 — Create the screenplay**
From the elaborated content, create a short screenplay. Each scene has:
- visual_type: one of "3D animation", "diagram", "B-roll", "motion graphics", \
"cinematic illustration". Pick what fits best (e.g. medical/science → 3D animation; \
processes → diagram; nature/history → B-roll).
- visual_prompt: 1–2 concrete, filmable sentences. Describe exactly what the viewer \
sees: subjects, actions, camera angle if helpful. Be specific (e.g. "A 3D heart model \
with a hole in the septum; blue and red streams show blood mixing between ventricles" \
not "something about the heart").
- voiceover: The exact narration for this scene (1–3 sentences). Match the visuals; \
the voice-over and image must align.

Output ONLY valid JSON matching this schema (no markdown, no code fence):
{
  "elaborated_content": "Your full elaborated description from Step 1.",
  "project_title": "Short title for the video (e.g. 'What Is VSD?')",
  "scenes": [
    {
      "visual_type": "3D animation",
      "visual_prompt": "Concrete, filmable description of what we see.",
      "voiceover": "Exact narration for this scene."
    }
  ]
}

Example (medical):
{
  "elaborated_content": "Ventricular septal defect (VSD) is...",
  "project_title": "What Is a Ventricular Septal Defect?",
  "scenes": [
    {
      "visual_type": "3D animation",
      "visual_prompt": "A 3D anatomical heart model; the septum between left and \
right ventricles has a visible hole; animated blue (oxygenated) and red \
(deoxygenated) blood streams show flow mixing through the defect.",
      "voiceover": "A ventricular septal defect is a hole in the wall that separates \
the heart's two lower chambers. Blood can flow through it and mix between the left \
and right sides."
    },
    {
      "visual_type": "3D animation",
      "visual_prompt": "Same heart model from the outside; subtle glow or highlight \
on the septum area; text label 'Septum' appears briefly.",
      "voiceover": "That wall is called the septum. When it doesn't close fully \
before birth, a VSD remains."
    }
  ]
}

Rules:
- elaborated_content must be the full enhanced text; do not skip it.
- visual_prompt must be specific and filmable. No vague phrases like \
"show the concept"—describe what is literally on screen.
- Keep 2–5 scenes. Order: intro/context → main idea(s) → recap or takeaway if needed.
- Return only the JSON object, no other text."""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def _call_openai(text: str) -> httpx.Response:
    """HTTP call to OpenAI with automatic retry on transport failures."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        return await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": config.OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": DIRECTOR_SYSTEM},
                    {"role": "user", "content": text},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
        )


async def get_screenplay(text: str) -> Screenplay:
    """Generate a Screenplay from user text via OpenAI."""
    if not config.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set. Add it to your environment.",
        )

    resp = await _call_openai(text)

    if resp.status_code != 200:
        err = resp.text
        try:
            err = resp.json().get("error", {}).get("message", err)
        except Exception:
            pass
        logger.error("OpenAI returned %s: %s", resp.status_code, err)
        raise HTTPException(status_code=502, detail=f"OpenAI error: {err}")

    data = resp.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content") or "{}"
    raw = json.loads(content)
    logger.info("Screenplay generated: %s (%d scenes)", raw.get("project_title"), len(raw.get("scenes", [])))
    return Screenplay.model_validate(raw)
