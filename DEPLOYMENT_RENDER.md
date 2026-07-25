# Deploy the Strang API on Render (free preview)

The repository includes a Render Blueprint in `render.yaml`.

## Deploy

1. Push the current branch to GitHub.
2. In Render, choose **New > Blueprint** and connect
   `berbir12/Strang_HeyGen`.
3. Render will detect `render.yaml`. Enter every secret marked
   `sync: false`.
4. Set `PUBLIC_API_BASE_URL` to the URL Render assigns, for example
   `https://strang-api.onrender.com`.
5. Deploy and verify:
   - `GET https://YOUR-URL/health`
   - `GET https://YOUR-URL/waitlist/count`
6. Update the landing-page environment variable `VITE_STRANG_API_URL` and
   the extension production API URL to the same Render URL.
7. In Stripe, add `https://YOUR-URL/stripe/webhook` as the webhook endpoint
   and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

## Important free-tier limitations

Render's free web services sleep after inactivity and use an ephemeral
filesystem. The current backend stores jobs, users, billing usage, and the
library in SQLite, so this deployment is a **preview**, not a safe production
deployment for paid customers. A restart or redeploy can remove the database.

Before accepting paid subscriptions, move persistence to the existing
Supabase Postgres project (or another managed Postgres service), then run the
Stripe webhook and usage-limit tests against that database.

