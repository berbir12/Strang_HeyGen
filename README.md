# Strang — AI Video Explainer

**Turn any text into a video. In your browser.**

Strang is a Chrome extension that turns what you read into what you watch. Highlight text on any webpage—or paste it in—and get a clear, AI-generated explainer video in minutes. No switching apps, no copying links. Just select, generate, and watch.

---

## Why Strang?

- **From the page you’re on** — Select text on articles, docs, or Wikipedia and generate a video without leaving the tab.
- **Paste anything** — No selection? Paste a paragraph, a definition, or a concept and get a video.
- **Watch in the sidebar** — Your explainer video plays right inside the extension. No new tabs, no clutter.
- **One click** — Highlight or paste, hit Generate, and wait for your video. No complex setup.

Whether you’re studying, researching, or just curious, Strang turns dense or confusing text into short, watchable explanations.

---

## How it works

1. **Highlight** — Select the text you want explained on any supported page, or paste it into the extension.
2. **Generate** — Click one button. Strang sends the text to the AI and starts building your video.
3. **Watch** — When it’s ready, the video appears in the extension. Play, rewatch, and move on.

---

## What you need

- The **Strang Chrome extension** (install from the extension package in this repo).
- A **backend service** that handles video generation (configurable in the extension settings).

The extension talks to your backend; you can point it at your own server or a hosted endpoint.

---

**Ready to ship?** See **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** for a step-by-step guide (backend, landing, extension, Chrome Web Store).

---

## Development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set OPENAI_API_KEY and HEYGEN_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `GET http://localhost:8000/health`
- Waitlist: `POST /waitlist` (JSON: `{"email": "..."}`), `GET /waitlist/count`
- Generate: `POST /generate` (JSON: `{"text": "..."}`), then poll `GET /generate/status/{job_id}`

Tests: `pip install -r requirements-dev.txt && pytest tests -v`

### Extension

```bash
cd extension
npm install
npm run build
```

Load the `extension/dist` folder in Chrome (Extensions → Load unpacked). Point the extension’s backend URL to `http://localhost:8000` in settings (gear icon). Optional: set an API key if your backend uses `STRANG_API_KEY`.

### Landing page

```bash
cd landing_page
npm install
# Optional: create .env with VITE_STRANG_API_URL=http://localhost:8000 for local waitlist
npm run dev
```

Open http://localhost:8080. To enable Plausible analytics in production, set `VITE_PLAUSIBLE_DOMAIN=yourdomain.com` in your build env.

---

## Get early access

We’re opening up to a small group first. **Join the waitlist** (or use the deployed landing page from this repo) to be notified when Strang is ready.

---

*Strang — From text to video, without leaving the page.*
# Strang-Extension
