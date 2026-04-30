---
name: debug-prod
description: Diagnose Cloud Run / Firestore / Gemini / auth issues in production. Use when the user says something is broken in prod, errors are showing, or asks to read logs.
---

# debug-prod

Triage runbook for production issues. Match symptoms below; each entry has a one-line diagnostic command and a likely fix.

## When to use
- "It's broken in prod"
- "Users can't log in"
- "The chatbot is giving errors"
- "Why is sync failing?"
- "What's in the Cloud Run logs?"

## Quick triage commands

### Live tail
```bash
gcloud run services logs tail wealthwise --region=asia-southeast1
```

### Last 50 errors
```bash
gcloud run services logs read wealthwise \
  --region=asia-southeast1 --limit=50 --log-filter='severity>=ERROR'
```

### Health check
```bash
SERVICE_URL=$(gcloud run services describe wealthwise --region=asia-southeast1 --format='value(status.url)')
curl -i "${SERVICE_URL}/api/health"
```

### Recent revisions
```bash
gcloud run revisions list --service=wealthwise --region=asia-southeast1 --limit=5
```

## Symptoms → fixes

### Auth: users redirected to `/login` in a loop
**Likely cause:** middleware cookie name mismatch with server, or Admin SDK rejecting session cookie.

Check:
```bash
gcloud run services logs read wealthwise --region=asia-southeast1 \
  --log-filter='severity>=WARNING AND textPayload:"verifySessionCookie"' --limit=20
```

Common fixes:
- `SESSION_COOKIE_NAME` env var is set on Cloud Run and matches what middleware reads
- `firebase-admin-key` secret is the current service account (not expired/disabled)
- Browser actually has the cookie (DevTools → Application → Cookies)

### Auth: "Invalid token" on sign-in
**Likely cause:** clock skew, or service account project mismatch.

- Verify the Admin SDK service account belongs to project `epj-project`
- Check Cloud Run instance's clock isn't drifting (rare, but possible after long idle)

### Chat: "AI service unavailable" from `/api/chat`
**Likely cause:** Gemini key missing/expired, model name wrong, or rate limit hit.

```bash
gcloud run services logs read wealthwise --region=asia-southeast1 \
  --log-filter='textPayload:"Gemini"' --limit=20
```

- `GEMINI_API_KEY` secret is wired and current
- `GEMINI_MODEL` env is set (default: `gemini-2.5-flash`)
- Quota in Google AI Studio not exceeded

### Save: data not persisting / "Email not verified"
**Likely cause:** `savePlan` is rejecting because `emailVerified` is false.

- The session cookie's `email_verified` claim must be true. Google sign-in usually sets this; other providers may not
- Check the cookie's claims: temporarily log in `getSessionUser()` and inspect `decoded.email_verified`

### External sync: empty results / NaN amounts
**Likely cause:** retire-tax / retire-5% schema changed, or service account lacks read access.

- The Admin SDK service account needs `roles/datastore.viewer` on the cross-DB project (or the same project for multi-DB)
- Add a Zod schema for the upstream shape — currently the code uses `as ExternalHolding[]` (no runtime validation)

### Build failing
- `--frozen-lockfile` requires `pnpm-lock.yaml` to match `package.json`. Run `pnpm install` locally and commit
- TypeScript errors: run `pnpm typecheck` locally — the build runs the same check
- Missing build arg for `NEXT_PUBLIC_*` → check Cloud Build secret bindings

### High latency / cold starts
- Cloud Run scaled to zero → first request after idle is slow (~2-3s)
- Mitigation: set `_MIN_INSTANCES: "1"` in `cloudbuild.yaml` (costs ~$5/mo for always-warm)
- Or trim bundle size (Recharts, Motion are the biggest)

### High Gemini bill
- Today there is **no rate limit** on `/api/chat` — a single bad-actor session can spam it
- Fix: add per-uid rate limiting (e.g. Upstash Redis or in-memory LRU with sliding window)
- Short-term: monitor in Google AI Studio dashboard, disable abuser uids in Firebase Auth

## Reading Firestore directly (Admin)

For inspecting a user's doc when reproducing a bug locally:

```bash
# Set up Application Default Credentials with the Admin service account
export GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json

# Read a plan
gcloud firestore documents read 'users/<UID>/plan/current' \
  --database=ai-studio-90135de2-3486-4320-b16e-586197ead7d3
```

**Never share user data outside debugging.** PII must be redacted in any shared output.

## When to roll back vs. fix forward
- Rollback if: error rate > 5%, login broken, data corruption risk
- Fix forward if: degraded but functional, isolated to a non-critical path, fix is small and verified locally

Rollback command:
```bash
gcloud run services update-traffic wealthwise --region=asia-southeast1 \
  --to-revisions=<previous-revision>=100
```
