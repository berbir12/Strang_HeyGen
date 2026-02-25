# Next Steps — Make Strang Fantastic

A prioritized roadmap. **Done:** 1–9 below. **Remaining:** deployment, Chrome Web Store, optional nice-to-haves.

---

## 1. Branding consistency ✅

**Current:** Landing page uses **Strang**; extension and HTML still say **AI Video Explainer**.

**Do:**
- In extension: set `manifest.json` `name` and `action.default_title` to **Strang** (or “Strang — AI Video Explainer”).
- In `sidepanel.html` and `App.jsx`: use **Strang** in the title and main heading so the product feels like one brand.

---

## 2. Waitlist that actually works ✅

**Current:** `WaitlistForm` only simulates submit with `setTimeout`; no emails are stored.

**Do:**
- Add a real backend for signups: e.g. **Supabase** (table `waitlist`: email, referral_code, created_at), **Airtable**, or a small serverless function (Vercel/Netlify).
- In `WaitlistForm`: `POST` to your API; show real success/error; optionally generate a unique referral link per user.
- Optional: show a real “2,500+” (or live count) from the DB if you want social proof.

---

## 3. Extension UX polish ✅

**Current:** One “Generate” button; no sense of progress; no guidance when things fail or when video is ready.

**Do:**
- **Progress:** Show steps (e.g. “Writing script…” → “Creating video…” → “Done”) so users know it’s working during the 2–4 min wait.
- **Limits:** Add a soft character limit (e.g. 2k–3k) with a short warning so users don’t send huge blocks and hit API limits.
- **When done:** Add “Open in new tab” and “Copy video link” so users can share or watch full-screen.
- **Empty state:** When there’s no video yet, show a one-line “Highlight text or paste above, then click Generate” so new users know what to do.
- **Errors:** Keep current error area; add a “Try again” that keeps the same text and re-calls generate.

---

## 4. Backend robustness ✅

**Current:** Jobs are in-memory (`JOBS` dict); restart or scale = lost jobs. No auth, no rate limit.

**Do:**
- **Persistence:** Store jobs in a DB (e.g. **Supabase**, **Redis**) or at least in a file so restarts don’t lose in-progress jobs; extension polling can then survive backend restarts.
- **Rate limiting:** Add a simple rate limit per IP or per API key (e.g. 5–10 generations per hour) to protect OpenAI/HeyGen costs.
- **Health check:** Extend `/health` to optionally check OpenAI and HeyGen (e.g. minimal call or balance check) and return “degraded” if keys are missing or invalid.
- **API key (optional):** For production, require an API key in the extension settings and validate it in the backend so only your extension/users can call the API.

---

## 5. Deployment and production

**Current:** Backend runs locally; extension points at `localhost:8000`; landing can be on Vercel.

**Do:**
- **Backend:** Deploy to **Railway**, **Fly.io**, **Render**, or **Vercel serverless**; set `OPENAI_API_KEY` and `HEYGEN_API_KEY` in env; use a single production URL.
- **Extension:** In production build or settings, default backend URL to your deployed API (e.g. `https://api.strang.ai`); keep “custom backend” in settings for power users.
- **Landing:** Already suitable for Vercel; ensure form points to production waitlist API and env (e.g. `VITE_WAITLIST_API`) is set.
- **Chrome Web Store:** When ready, prepare store listing (description, screenshots, privacy policy); use the production backend URL and ensure host permissions are minimal (e.g. only your API + optional `<all_urls>` if you need selection everywhere).

---

## 6. Security and safety ✅

**Current:** CORS `allow_origins=["*"]`; no auth; keys only in backend (good).

**Do:**
- Restrict CORS to your extension origin and landing domain (e.g. `https://your-landing.vercel.app`, `chrome-extension://...`) instead of `*` when you have fixed origins.
- Never expose OpenAI or HeyGen keys to the frontend; keep all secrets in backend env.
- If you add an API key for the extension, validate it on every request and return 401 when invalid.

---

## 7. Testing and reliability ✅

**Current:** No automated tests visible.

**Do:**
- **Backend:** Add a few tests (e.g. pytest) for: `POST /generate` with mock OpenAI/HeyGen (e.g. respx/httpx), and `GET /generate/status/{job_id}` for pending/completed/failed.
- **Extension:** Consider one E2E flow (e.g. Playwright) that opens the side panel, sets backend URL, pastes text, clicks Generate, and waits for a video or error (can use a mock backend).
- **CI:** Run backend tests and extension build (e.g. `npm run build`) on push so you don’t ship broken builds.

---

## 8. Landing page upgrades ✅

**Current:** Strong hero and How it works; waitlist is fake; no FAQ or depth.

**Do:**
- **FAQ:** Add a short FAQ (e.g. “What kind of text can I use?”, “How long does a video take?”, “Is there a limit?”).
- **Social proof:** When you have real users, add a short testimonial or “Used by X students/researchers” (even if small at first).
- **404:** Style `NotFound` to match the rest of the site and add a link back to home.
- **Analytics:** Add lightweight analytics (e.g. Plausible or Vercel Analytics) to see traffic and waitlist conversions without invading privacy.

---

## 9. Documentation and onboarding ✅

**Current:** README is user-facing; no contributor or deploy guide.

**Do:**
- **Backend:** Add a `.env.example` with `OPENAI_API_KEY`, `HEYGEN_API_KEY`, and optional `DATABASE_URL` (or similar) so others can run the backend.
- **README:** Add a “Development” section: how to run backend, extension, and landing locally; link to NEXT_STEPS for contributors.
- **Extension:** Optional first-run tooltip: “Select text on any page, then open Strang and click Generate.”

---

## 10. Nice-to-haves (later)

- **Extension:** Keyboard shortcut (e.g. Ctrl+Shift+V) to open side panel or trigger “Use selection from page”.
- **Extension:** History of last N generated videos (e.g. in `chrome.storage.local`) so users can rewatch without regenerating.
- **Backend:** Webhook or SSE instead of polling so the extension gets “video ready” without constant polling.
- **Landing:** Blog or “Use cases” page (e.g. studying, research, accessibility) to improve SEO and trust.

---

## Suggested order

1. **Branding** (quick win, consistent experience).  
2. **Real waitlist** (so signups aren’t lost).  
3. **Extension UX** (progress, limits, copy link / open in tab).  
4. **Backend persistence + rate limit** (reliability and cost control).  
5. **Deploy backend + production URL in extension.**  
6. **CORS + optional API key** (security).  
7. **Tests + CI** (confidence for future changes).  
8. **Landing FAQ + 404 + analytics.**  
9. **Docs and onboarding.**  
10. **Nice-to-haves** as you have time.

If you tell me which area you want to tackle first (e.g. “waitlist” or “extension UX”), I can outline concrete steps and code changes for that part.
