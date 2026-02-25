# Strang — Step-by-step launch guide (Option B: full public v1)

Use this checklist in order. Complete each section before moving to the next.

---

## Phase 0 — Before you start

### 0.1 Accounts and services

- [ ] **Google Chrome Web Store Developer account** — One-time $5 registration at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). Use the same Google account you’ll use to publish.
- [ ] **Vercel account** — For landing page (or Netlify / your host). [vercel.com](https://vercel.com)
- [ ] **Backend host** — Pick one: [Railway](https://railway.app), [Fly.io](https://fly.io), [Render](https://render.com), or similar. Have an account ready.
- [ ] **Domain (optional)** — If you want `strang.ai` or `api.strang.ai`, have the domain and DNS access. You can launch first on default URLs (e.g. `yourapp.railway.app`, `your-landing.vercel.app`).

### 0.2 Extension icons

Chrome Web Store requires icons. Create (or export) and place in `extension/public/`:

- [ ] **128x128** — `icon128.png` (required for store)
- [ ] **48x48** — `icon48.png` (optional but recommended)
- [ ] **16x16** — `icon16.png` (optional, for toolbar)

Update `extension/public/manifest.json` to reference them (see Step 3.2).

### 0.3 Privacy policy URL

You need a public URL for your privacy policy (required for the Chrome Web Store).

- [ ] **Option A:** Add a `/privacy` page on your landing site and use `https://your-landing-domain.com/privacy`.
- [ ] **Option B:** Use a simple static page on GitHub Pages or a one-pager (e.g. [Termly](https://termly.io), [PrivacyPolicies.com](https://www.privacypolicies.com)) and note the URL.

We’ll add the landing `/privacy` page in Phase 2.

---

## Phase 1 — Backend

### 1.1 Prepare environment variables

Create a list (or `.env` on your machine—do **not** commit it). You’ll paste these into your host later.

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `OPENAI_API_KEY` | Yes | From [platform.openai.com](https://platform.openai.com/api-keys) |
| `HEYGEN_API_KEY` | Yes | From HeyGen dashboard |
| `STRANG_API_KEY` | No | Strong random string if you want to lock the API to your extension |
| `CORS_ORIGINS` | No (default `*`) | Comma-separated: landing URL + store extension origin (see 1.3) |
| `RATE_LIMIT_REQUESTS` | No | Default 10 |
| `RATE_LIMIT_WINDOW_SEC` | No | Default 3600 |

For a strict CORS setup later, you’ll set something like:

```text
CORS_ORIGINS=https://your-landing.vercel.app,https://strang.ai,chrome-extension://YOUR_EXTENSION_ID
```

You won’t have the extension ID until after the first upload (Step 4.3). You can start with `*` or only your landing URL and add the extension origin when you have it.

### 1.2 Deploy the backend

**Example: Railway**

1. Push your repo to GitHub (if not already). Repo: [github.com/berbir12/Strang1](https://github.com/berbir12/Strang1)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub → select your repo.
3. Set **Root Directory** to `backend` (or the folder that contains `main.py`).
4. Add a **Service** and set start command, e.g.:
   - `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - (Railway often sets `PORT` automatically.)
5. In the service → **Variables**, add every variable from 1.1 (e.g. `OPENAI_API_KEY`, `HEYGEN_API_KEY`, then optional ones).
6. Deploy. Once live, open **Settings** → **Domains** → Generate or add a domain (e.g. `strang-api.up.railway.app` or your custom `api.strang.ai`).
7. Note the **public backend URL** (e.g. `https://strang-api.up.railway.app`). No trailing slash.

**Example: Render**

1. New → Web Service → Connect repo → select repo.
2. Root directory: `backend`.
3. Build command: `pip install -r requirements.txt` (or leave empty if no build step).
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add env vars in **Environment**.
6. Deploy and note the URL (e.g. `https://strang-backend.onrender.com`).

### 1.3 Smoke-test backend

- [ ] Open `https://YOUR_BACKEND_URL/health` in a browser. You should see something like `{"status":"ok","openai_configured":true,"heygen_configured":true}`.
- [ ] Waitlist:  
  `curl -X POST https://YOUR_BACKEND_URL/waitlist -H "Content-Type: application/json" -d "{\"email\":\"you@example.com\"}"`  
  Then open `https://YOUR_BACKEND_URL/waitlist/count` — count should be at least 1.

---

## Phase 2 — Landing page

### 2.1 Add privacy policy page

- [ ] In your landing app, add a route and page for `/privacy` (e.g. `landing_page/src/pages/Privacy.tsx`).
- [ ] Content: what data you collect (e.g. waitlist email, no tracking unless you add analytics), how you use it, and link to your contact. You can base it on a template from Termly or similar.
- [ ] Add the route in your router (e.g. `<Route path="/privacy" element={<Privacy />} />`).
- [ ] In the footer, add a link: “Privacy policy” → `/privacy`.
- [ ] Note the full URL: `https://YOUR_LANDING_DOMAIN/privacy`. This will be the **Privacy policy URL** for the Chrome Web Store.

### 2.2 Environment variables (landing)

For production build, set:

| Variable | Value |
|----------|--------|
| `VITE_STRANG_API_URL` | Your backend URL from Phase 1 (e.g. `https://strang-api.up.railway.app`) |
| `VITE_PLAUSIBLE_DOMAIN` | (Optional) Your landing domain for Plausible, e.g. `strang.ai` |

### 2.3 Deploy landing (e.g. Vercel)

1. Connect your GitHub repo to Vercel: [github.com/berbir12/Strang1](https://github.com/berbir12/Strang1).
2. **Root Directory**: set to `landing_page` (or wherever your Vite app is).
3. **Build command**: `npm run build`.
4. **Output directory**: `dist` (default for Vite).
5. **Environment variables**: add `VITE_STRANG_API_URL` (and optionally `VITE_PLAUSIBLE_DOMAIN`) in the Vercel project settings.
6. Deploy. Use the default URL (e.g. `your-project.vercel.app`) or add a custom domain (e.g. `strang.ai`).
7. Open the site, go to the waitlist section, submit an email, and confirm the count updates (or check backend `/waitlist/count`).

- [ ] Landing is live.
- [ ] Waitlist form works (email stored, count correct).
- [ ] Privacy policy is reachable at `https://YOUR_LANDING_DOMAIN/privacy`.

---

## Phase 3 — Extension (production build)

### 3.1 Default backend URL for production

So new users don’t have to configure the backend:

- [ ] In the extension, set the **default** backend URL to your production API when building for the store. For example in `extension/src/App.jsx` (and anywhere else that reads the default), use a build-time or runtime default:

  - **Option A (simple):** In `App.jsx`, change `DEFAULT_BACKEND` to your production URL and use that for the “production” build you upload to the store. Keep a separate dev default (e.g. via env or a comment) for local development.
  - **Option B (env):** Use Vite env: e.g. `VITE_STRANG_API_URL` and in the extension build set it to your backend URL; default to that when present, else `http://localhost:8000`. Then in CI or locally, build with the right env for store vs dev.

Implement one approach and document it in the README (e.g. “For store build, set DEFAULT_BACKEND to …” or “Build with VITE_STRANG_API_URL=…”).

### 3.2 Icons and manifest (required for Chrome Web Store)

- [ ] Icons are in `extension/public/` (see Phase 0.2): `icon128.png`, `icon48.png`, `icon16.png`.
- [ ] In `extension/public/manifest.json`, add an `"icons"` key right after `"description"`:

```json
"icons": {
  "16": "icon16.png",
  "48": "icon48.png",
  "128": "icon128.png"
},
```

- [ ] If your backend requires an API key for public users, you can pre-fill a shared key in the extension (only if you’re okay with it being visible in the built extension) or instruct users to get a key from your site. Prefer requiring the key from your backend signup flow and users pasting it in extension Settings.

### 3.3 Build and zip for Chrome Web Store

1. In the extension directory, install and build:

   ```bash
   cd extension
   npm ci
   npm run build
   ```

2. Zip the **contents** of the `dist` folder (not the folder itself). From the repo root, for example:

   - **Windows (PowerShell):**  
     `Compress-Archive -Path extension\dist\* -DestinationPath strang-extension.zip`
   - **macOS/Linux:**  
     `cd extension/dist && zip -r ../../strang-extension.zip .`

3. Confirm the zip contains at least: `manifest.json`, `sidepanel.html`, `background.js`, `content.js`, `assets/`, and any icons referenced in the manifest.

- [ ] `strang-extension.zip` is ready and under the store’s max size (if any).

---

## Phase 4 — Chrome Web Store

### 4.1 Developer dashboard

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account and pay the one-time $5 developer fee if prompted.
3. Click **“New item”** and upload `strang-extension.zip`. If the manifest or icons are invalid, fix errors and re-upload.

### 4.2 Store listing

Fill in every required field:

| Field | What to provide |
|-------|------------------|
| **Short description** | One line, e.g. “Turn any text into a short AI explainer video. Highlight or paste—watch in the sidebar.” |
| **Detailed description** | 2–4 paragraphs: what Strang does, how it works (highlight/paste → generate → watch), that it uses your backend / Strang’s API, and that users need to allow the extension to run on the sites they select from. Mention “AI-generated video” and “HeyGen” if the store asks about AI/third-party services. |
| **Category** | e.g. Productivity or Education. |
| **Language** | Primary language (e.g. English). |
| **Screenshots** | At least one; 1280x800 or 640x400. Show the side panel with the Strang UI (paste box, Generate, and ideally a generated video). You can add 2–5 screenshots. |
| **Promotional images** | If required: small promo tile and marquee (check current store requirements). |
| **Privacy policy** | **Required.** Use the URL from Phase 2.1: `https://YOUR_LANDING_DOMAIN/privacy`. |

### 4.3 Single purpose and permissions

- [ ] The store may ask for a “single purpose” description: e.g. “Strang has a single purpose: to generate short AI explainer videos from text that the user selects or pastes, and to play those videos in the extension side panel.”
- [ ] **Permissions:** You use `activeTab`, `sidePanel`, `storage`, `scripting`, and `host_permissions` for `http://localhost:8000/*` and `https://*/*`. In the “Justification” (if asked), explain: “We need access to the current tab to read the user’s selected text when they click ‘Use selection from page.’ We need https to communicate with the Strang API. localhost is for developers who run their own backend.” Reduce to `<all_urls>` only if you don’t need localhost for dev.

### 4.4 Extension ID and CORS (optional but recommended)

- [ ] After the first upload, the dashboard will show an **Extension ID** (e.g. `abcdefghijklmnopqrstuvwxyzabcdef`). It looks like `chrome-extension://EXTENSION_ID`.
- [ ] Add this origin to your backend `CORS_ORIGINS`:  
  `chrome-extension://YOUR_EXTENSION_ID`  
  Then redeploy the backend with the updated env so only your store extension (and your landing) can call the API (if you’re not using a shared API key).

### 4.5 Submit for review

- [ ] Set visibility (e.g. “Public” or “Unlisted” for a soft launch).
- [ ] Submit for review. Review can take a few hours to a few days.
- [ ] When approved, note the public store URL and optionally add it to your landing page (“Get the Chrome extension”).

---

## Phase 5 — Pre-launch checks

Run through once as a first-time user:

- [ ] **Landing:** Visit the site, join waitlist, open privacy policy, check FAQ and 404.
- [ ] **Extension (from store):** Install from the Chrome Web Store (or the published link). Do **not** point it at localhost.
- [ ] **Flow:** Open a site (e.g. Wikipedia), select a short paragraph, open Strang side panel, click “Use selection from page,” then “Generate video.” Wait for completion and play the video. Try “Copy link” and “Open in new tab.”
- [ ] **Settings:** Open extension Settings, confirm backend URL is your production API. If you use an API key, set it and generate again to confirm it still works.
- [ ] **Backend:** Check `/health` and, if you have an admin view or logs, confirm no unexpected errors during the test.

---

## Phase 6 — Go live

- [ ] Landing page “Get the extension” / “Install” button links to the Chrome Web Store listing.
- [ ] README or landing mentions that the extension is available in the Chrome Web Store and links to the store page.
- [ ] Optional: Announce (e.g. waitlist email, Twitter, Product Hunt) with the store link and landing URL.

---

## Quick reference — URLs to have handy

| What | URL |
|------|-----|
| Backend | `https://YOUR_BACKEND_URL` |
| Landing | `https://YOUR_LANDING_DOMAIN` |
| Privacy policy | `https://YOUR_LANDING_DOMAIN/privacy` |
| Chrome Web Store listing | After approval: `https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID` |

---

If you tell me your chosen backend host (Railway / Render / Fly) and whether you use a custom domain, I can add concrete commands and screens for that host and add the privacy page and default-backend change to the repo next.
