# Building Strang for the Chrome Web Store

## Icons (required)

Place these in `extension/public/` (they are copied into `dist/` on build):

- **icon128.png** — 128×128 px (required by Chrome Web Store)
- **icon48.png** — 48×48 px (recommended)
- **icon16.png** — 16×16 px (optional, toolbar)

If these files are missing, the packed extension may fail to load in Chrome. Use any image tool or [favicon.io](https://favicon.io) to generate them from a logo.

## Production build (default API URL)

To ship the extension with your production API as the default backend URL:

```bash
cd extension
# Set your production API URL (no trailing slash)
export VITE_STRANG_API_URL=https://your-api.example.com   # macOS/Linux
# Or on Windows (PowerShell):
# $env:VITE_STRANG_API_URL="https://your-api.example.com"

npm ci
npm run build
```

Then zip the contents of `dist/` for upload to the Chrome Web Store (see LAUNCH_CHECKLIST.md Phase 3.3).

## Local development

Without `VITE_STRANG_API_URL`, the default backend is `http://localhost:8000`. Load `extension/dist` as an unpacked extension and set the backend in the extension settings if needed.
