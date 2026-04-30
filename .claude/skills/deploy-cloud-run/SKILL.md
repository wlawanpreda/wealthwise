---
name: deploy-cloud-run
description: Deploy the app to Cloud Run via Cloud Build, manage Secret Manager values, and apply Firestore rules. Use when the user asks to deploy, ship, push to prod, rotate a secret, or update Cloud Run config.
---

# deploy-cloud-run

Operational skill for shipping changes to Cloud Run. The reference runbook is [DEPLOY.md](../../../DEPLOY.md). Use this skill to guide the user through it interactively and avoid common mistakes.

## When to use
- "Deploy to prod" / "ship this" / "release"
- "Rotate the Gemini key"
- "Add a new secret"
- "Update Cloud Run memory / scaling"
- "The deploy is broken"

## Project facts
- **GCP project:** `epj-project`
- **Region:** `asia-southeast1`
- **Service:** `wealthwise`
- **Image registry:** Artifact Registry repo `wealthwise`
- **Build pipeline:** [cloudbuild.yaml](../../../cloudbuild.yaml) (triggered manually or via [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml) on push to main)

## Pre-flight checks

Before deploying, confirm:
1. `pnpm typecheck && pnpm lint && pnpm test` is green
2. `pnpm-lock.yaml` is committed (Cloud Build runs `--frozen-lockfile`)
3. No secrets in the diff (`git diff` for `.env*`, service account JSON, API keys)
4. Firestore rules diff is intentional — rules deploy separately

## Standard deploy

Manual one-shot from local:
```bash
gcloud builds submit --config=cloudbuild.yaml --region=asia-southeast1
```

CI deploy (push to `main`): `.github/workflows/deploy.yml` calls the same Cloud Build pipeline via Workload Identity Federation.

After deploy, verify:
```bash
SERVICE_URL=$(gcloud run services describe wealthwise \
  --region=asia-southeast1 --format='value(status.url)')
curl "${SERVICE_URL}/api/health"
# Expect: {"status":"ok","timestamp":...}
```

## Rotating a secret (e.g. Gemini key)

```bash
echo -n "$NEW_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
# Cloud Run picks up :latest on next revision deploy
gcloud run services update wealthwise --region=asia-southeast1 \
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest
```

To disable an old version:
```bash
gcloud secrets versions disable <VERSION_NUMBER> --secret=gemini-api-key
```

## Adding a new secret

1. Create the secret:
   ```bash
   gcloud secrets create my-new-secret --replication-policy=automatic
   echo -n "$VALUE" | gcloud secrets versions add my-new-secret --data-file=-
   ```
2. Grant runtime access:
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe epj-project --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding my-new-secret \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```
3. Wire into deploy — edit `cloudbuild.yaml` `--set-secrets` flag
4. Reference in code via `getServerEnv()` after extending [src/lib/env.ts](../../../src/lib/env.ts) Zod schema

## Rolling back

```bash
# List revisions (newest first)
gcloud run revisions list --service=wealthwise --region=asia-southeast1

# Route 100% to a previous revision
gcloud run services update-traffic wealthwise \
  --region=asia-southeast1 \
  --to-revisions=wealthwise-XXXXX-XXX=100
```

## Applying Firestore rules

Rules live in [firestore.rules](../../../firestore.rules). They deploy separately from app code:

```bash
firebase deploy --only firestore:rules --project epj-project
```

**Order matters:**
- More permissive rules → deploy rules **first**, then code
- More restrictive rules → deploy code **first**, then rules
- Otherwise users hit either denied writes or NEW writes failing on OLD code reads

## Updating Cloud Run config

Edit `cloudbuild.yaml` substitutions for memory/CPU/scaling. Common levers:
- `_MEMORY: 512Mi` → bump to `1Gi` if you see OOM
- `_MIN_INSTANCES: "0"` → set to `1` for warm-start (costs $$ — discuss first)
- `_MAX_INSTANCES: "10"` → bump if you see throttling

## Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| Build: `Cannot find lock file` | `pnpm-lock.yaml` not committed | `pnpm install` then commit |
| Deploy: `Permission denied on secret` | Runtime SA missing accessor role | Re-grant `roles/secretmanager.secretAccessor` |
| Runtime: `Invalid server environment: GEMINI_API_KEY: Required` | Secret not wired in `cloudbuild.yaml` | Add to `--set-secrets` flag |
| Runtime: `auth/insufficient-permission` from Admin SDK | Service account JSON wrong / expired | Generate new key in Firebase console + replace `firebase-admin-key` secret |
| 502 Bad Gateway | Cold start timeout (large bundle) | Set `_MIN_INSTANCES: "1"` or trim deps |
| `firestore: PERMISSION_DENIED` | Rules deployed wrong order | Deploy rules + code in correct order; verify rules with emulator next time |

## After deploy

- Tail logs for the first ~5 minutes:
  ```bash
  gcloud run services logs tail wealthwise --region=asia-southeast1
  ```
- Check `/api/health` from a new browser session
- Hit the chat endpoint to verify Gemini key is wired
- Sign in to verify Admin SDK session cookie creation
