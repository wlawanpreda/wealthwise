---
description: Start the Next.js dev server. Reminds the user to set up .env.local first.
---

Before starting the dev server, verify the user has `.env.local`:

1. Check if `.env.local` exists at repo root
2. If not, copy `.env.example` to `.env.local` and tell the user to fill in:
   - `NEXT_PUBLIC_FIREBASE_*` values from their Firebase web app config
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT` (paste the service account JSON on a single line)
   - `GEMINI_API_KEY`
3. If it exists, just confirm and proceed

Then start the dev server in the background:
```bash
pnpm dev
```

The server runs at http://localhost:3000 with Turbopack. HMR is enabled.

To verify the server is up, hit `/api/health` after a few seconds.
