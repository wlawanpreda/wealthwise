# Deployment Runbook — Cloud Run + Cloud Build

GCP Project: **`epj-project`** Region: **`asia-southeast1`** Service: **`wealthwise`**

## One-time setup

### 1. Enable required APIs
```bash
gcloud config set project epj-project

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com
```

### 2. Create Artifact Registry repo
```bash
gcloud artifacts repositories create wealthwise \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Wealthwise container images"
```

### 3. Generate Firebase Admin service account
```bash
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save as firebase-admin-key.json (gitignored)

# Upload to Secret Manager
gcloud secrets create firebase-admin-key --replication-policy=automatic
gcloud secrets versions add firebase-admin-key --data-file=firebase-admin-key.json

# Gemini API key
echo -n "$YOUR_GEMINI_KEY" | gcloud secrets create gemini-api-key \
  --replication-policy=automatic --data-file=-
```

### 4. Store public Firebase config in Secret Manager
```bash
for KEY in \
  firebase-public-api-key \
  firebase-public-auth-domain \
  firebase-public-project-id \
  firebase-public-storage-bucket \
  firebase-public-app-id \
  firebase-public-messaging-sender-id \
  firebase-public-database-id \
  app-url; do
  gcloud secrets create "$KEY" --replication-policy=automatic
done

# Add a version (repeat per secret)
echo -n "AIza..." | gcloud secrets versions add firebase-public-api-key --data-file=-
echo -n "epj-project.firebaseapp.com" | gcloud secrets versions add firebase-public-auth-domain --data-file=-
# ...etc
```

### 5. Grant Cloud Build permissions
```bash
PROJECT_NUMBER=$(gcloud projects describe epj-project --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding epj-project \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding epj-project \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding epj-project \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding epj-project \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"
```

### 6. Cloud Run runtime service account access to secrets
```bash
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in gemini-api-key firebase-admin-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 7. Restrict the Firebase API key (important!)
GCP Console → APIs & Services → Credentials → API Keys
Set Application restrictions → HTTP referrers → add your Cloud Run URL + localhost.

## Deploy

### Manual (one-shot)
```bash
gcloud builds submit --config=cloudbuild.yaml --region=asia-southeast1
```

### From GitHub (CI/CD)
1. Set up Workload Identity Federation (recommended over JSON keys):
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe epj-project --format='value(projectNumber)')
   REPO="wlawanpreda/wealthwise"

   # Pool + OIDC provider
   gcloud iam workload-identity-pools create github \
     --location=global --display-name="GitHub Actions"

   gcloud iam workload-identity-pools providers create-oidc github \
     --location=global --workload-identity-pool=github \
     --display-name="GitHub OIDC" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository=='$REPO'" \
     --issuer-uri="https://token.actions.githubusercontent.com"

   # Allow GitHub OIDC to impersonate the Cloud Build SA
   gcloud iam service-accounts add-iam-policy-binding \
     "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
   ```

2. Add GitHub repo secrets at **Settings → Secrets and variables → Actions**:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER` — `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github`
   - `GCP_SERVICE_ACCOUNT` — `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`

3. Push to `main` → [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) triggers Cloud Build, then runs a `/api/health` smoke test against the live URL with retry/back-off.

### Auto-merge (solo workflow)
[`.github/workflows/auto-merge.yml`](.github/workflows/auto-merge.yml) auto-enables auto-merge on PRs you open yourself. Required setup once per repo:

```bash
# Enable repo-level auto-merge (required for the workflow to take effect)
gh repo edit --enable-auto-merge
```

Optional but recommended — branch protection so the auto-merge respects CI:

```bash
# main requires CI 'quality' check to pass before merge (no approval required for solo)
gh api -X PUT "repos/wlawanpreda/wealthwise/branches/main/protection" \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]="quality" \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```

After this: open a PR → CI runs → if green, merges automatically + deletes branch.

### Cost & monitoring alerts
Run the helper script once to create budget + alert policies:

```bash
BILLING_ACCOUNT_ID=$(gcloud billing accounts list --format='value(name)' | head -1)
ALERT_EMAIL=you@example.com BILLING_ACCOUNT_ID=$BILLING_ACCOUNT_ID \
  ./scripts/setup-cost-alerts.sh
```

Creates:
- Cloud Billing budget at $20/mo with 50%/90%/100%/150%-forecast email triggers
- Email notification channel
- Alert policies: 5xx error rate, P95 latency > 5s, Gemini request spike (>100/min)

The budget needs one manual step to wire the email — script prints the exact console URL.

## Apply Firestore rules
```bash
firebase deploy --only firestore:rules --project epj-project
```

## Verify
```bash
SERVICE_URL=$(gcloud run services describe wealthwise \
  --region=asia-southeast1 --format='value(status.url)')

curl "${SERVICE_URL}/api/health"
# {"status":"ok","timestamp":...}
```

## Rollback
```bash
# List revisions
gcloud run revisions list --service=wealthwise --region=asia-southeast1

# Route 100% to a previous revision
gcloud run services update-traffic wealthwise \
  --region=asia-southeast1 \
  --to-revisions=wealthwise-00042-abc=100
```

## Local Docker testing
```bash
# Build with build args (public env values)
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=AIza... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=epj-project.firebaseapp.com \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=epj-project \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=epj-project.firebasestorage.app \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=1:... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_DATABASE_ID=ai-studio-... \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  -t wealthwise:test .

# Run with secrets
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=... \
  -e FIREBASE_ADMIN_SERVICE_ACCOUNT="$(cat firebase-admin-key.json)" \
  -e RETIRE_TAX_DB_ID=ai-studio-... \
  -e RETIRE_5_PERCENT_DB_ID=ai-studio-... \
  wealthwise:test
```

## Cost optimization

- **min-instances=0** — scales to zero (no idle cost)
- **memory=512Mi cpu=1** — sufficient for SSR + Firestore
- **concurrency=80** — handle 80 req/instance before scale-out
- Use **Cloud CDN** in front for static assets if traffic grows
