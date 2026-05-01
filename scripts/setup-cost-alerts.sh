#!/usr/bin/env bash
# scripts/setup-cost-alerts.sh
#
# Idempotent setup for Cloud Billing budget + Cloud Run / Firestore /
# Gemini cost alerts. Safe to re-run — every command checks for an
# existing resource first.
#
# Required env vars:
#   ALERT_EMAIL        — where alert emails go (e.g. you@gmail.com)
#   BILLING_ACCOUNT_ID — find via `gcloud billing accounts list`
#
# Optional:
#   GCP_PROJECT        — default: epj-project
#   REGION             — default: asia-southeast1
#   SERVICE            — default: wealthwise
#   BUDGET_AMOUNT_USD  — default: 20
#   ERROR_RATE_THRESHOLD — default: 0.05 (5%)
#
# Usage:
#   BILLING_ACCOUNT_ID=01ABCD-23EFGH-45IJKL ALERT_EMAIL=you@gmail.com \
#     ./scripts/setup-cost-alerts.sh

set -euo pipefail

PROJECT="${GCP_PROJECT:-epj-project}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-wealthwise}"
BUDGET_AMOUNT_USD="${BUDGET_AMOUNT_USD:-20}"
ERROR_RATE_THRESHOLD="${ERROR_RATE_THRESHOLD:-0.05}"

: "${ALERT_EMAIL:?ALERT_EMAIL is required (e.g. you@gmail.com)}"
: "${BILLING_ACCOUNT_ID:?BILLING_ACCOUNT_ID is required (find via 'gcloud billing accounts list')}"

echo "==> Project: $PROJECT  Region: $REGION  Service: $SERVICE"
echo "==> Budget: \$$BUDGET_AMOUNT_USD/mo  Email: $ALERT_EMAIL"
echo

gcloud config set project "$PROJECT" >/dev/null

# ---------------------------------------------------------------------------
# 1. Billing budget with 50/90/100% email alerts
# ---------------------------------------------------------------------------
echo "==> [1/3] Cloud Billing budget"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
BUDGET_NAME="Wealthwise Monthly"

if gcloud billing budgets list \
     --billing-account="$BILLING_ACCOUNT_ID" \
     --format='value(displayName)' 2>/dev/null \
     | grep -Fxq "$BUDGET_NAME"; then
  echo "    [skip] budget '$BUDGET_NAME' already exists"
else
  gcloud billing budgets create \
    --billing-account="$BILLING_ACCOUNT_ID" \
    --display-name="$BUDGET_NAME" \
    --budget-amount="${BUDGET_AMOUNT_USD}USD" \
    --filter-projects="projects/$PROJECT_NUMBER" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0 \
    --threshold-rule=percent=1.5,basis=forecasted-spend
  echo "    [ok] created '$BUDGET_NAME' \$$BUDGET_AMOUNT_USD/mo"
  echo
  echo "    NOTE: gcloud cannot wire the budget to an email channel directly."
  echo "    Open the budget in the console and add '$ALERT_EMAIL' to the"
  echo "    'Manage notifications' section:"
  echo "      https://console.cloud.google.com/billing/$BILLING_ACCOUNT_ID/budgets"
fi

# ---------------------------------------------------------------------------
# 2. Email notification channel for monitoring alerts
# ---------------------------------------------------------------------------
echo "==> [2/3] Monitoring notification channel"

CHANNEL_DISPLAY="Wealthwise Email Alerts"
CHANNEL_ID=$(gcloud alpha monitoring channels list \
  --filter="displayName='$CHANNEL_DISPLAY'" \
  --format='value(name)' 2>/dev/null | head -1)

if [ -z "$CHANNEL_ID" ]; then
  CHANNEL_ID=$(gcloud alpha monitoring channels create \
    --display-name="$CHANNEL_DISPLAY" \
    --type=email \
    --channel-labels="email_address=$ALERT_EMAIL" \
    --format='value(name)')
  echo "    [ok] created channel: $CHANNEL_ID"
else
  echo "    [skip] channel exists: $CHANNEL_ID"
fi

# ---------------------------------------------------------------------------
# 3. Alert policies
# ---------------------------------------------------------------------------
echo "==> [3/3] Alert policies"

create_policy() {
  local NAME="$1"
  local POLICY_FILE="$2"

  if gcloud alpha monitoring policies list \
       --filter="displayName='$NAME'" \
       --format='value(name)' 2>/dev/null | grep -q .; then
    echo "    [skip] '$NAME' already exists"
  else
    gcloud alpha monitoring policies create \
      --policy-from-file="$POLICY_FILE" \
      --notification-channels="$CHANNEL_ID"
    echo "    [ok] created '$NAME'"
  fi
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Cloud Run high error rate
cat > "$TMP/error-rate.yaml" <<EOF
displayName: "Wealthwise — Cloud Run 5xx error rate"
combiner: OR
conditions:
  - displayName: "5xx > ${ERROR_RATE_THRESHOLD} of total"
    conditionThreshold:
      filter: |
        resource.type = "cloud_run_revision"
        AND resource.label."service_name" = "$SERVICE"
        AND metric.type = "run.googleapis.com/request_count"
        AND metric.label."response_code_class" = "5xx"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
documentation:
  content: |
    Cloud Run service '$SERVICE' is returning 5xx responses. Investigate
    via Cloud Logging filter:
      resource.type="cloud_run_revision" AND severity>=ERROR
  mimeType: text/markdown
EOF
create_policy "Wealthwise — Cloud Run 5xx error rate" "$TMP/error-rate.yaml"

# Cloud Run latency
cat > "$TMP/latency.yaml" <<EOF
displayName: "Wealthwise — Cloud Run P95 latency > 5s"
combiner: OR
conditions:
  - displayName: "P95 request latency > 5s for 5min"
    conditionThreshold:
      filter: |
        resource.type = "cloud_run_revision"
        AND resource.label."service_name" = "$SERVICE"
        AND metric.type = "run.googleapis.com/request_latencies"
      comparison: COMPARISON_GT
      thresholdValue: 5000
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_PERCENTILE_95
documentation:
  content: |
    P95 request latency for '$SERVICE' has been above 5s for 5 minutes.
    Common causes: cold starts (set min-instances to 1), Firestore slow
    queries, or Gemini upstream slowness.
  mimeType: text/markdown
EOF
create_policy "Wealthwise — Cloud Run P95 latency > 5s" "$TMP/latency.yaml"

# Gemini API request rate (unusual spike — possible abuse)
cat > "$TMP/gemini-spike.yaml" <<EOF
displayName: "Wealthwise — Gemini request spike"
combiner: OR
conditions:
  - displayName: "Gemini calls > 100/min sustained"
    conditionThreshold:
      filter: |
        resource.type = "consumed_api"
        AND resource.label."service" = "generativelanguage.googleapis.com"
      comparison: COMPARISON_GT
      thresholdValue: 100
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
documentation:
  content: |
    Sustained Gemini call rate above 100/min — possible abuse vector.
    Check Cloud Logging for the offending uid pattern in /api/chat.
  mimeType: text/markdown
EOF
create_policy "Wealthwise — Gemini request spike" "$TMP/gemini-spike.yaml"

echo
echo "✓ Done. Verify alerts at:"
echo "  https://console.cloud.google.com/monitoring/alerting/policies?project=$PROJECT"
echo
echo "Don't forget to add '$ALERT_EMAIL' to the budget notifications via the console."
