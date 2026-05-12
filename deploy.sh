#!/bin/bash
set -e

PROJECT_ID="dach-ai-mvps"
REGION="europe-west1"
SERVICE="hf-tasks"
TAG=$(date +%Y%m%d-%H%M%S)

echo "Deploying to Cloud Run..."

gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --region=$REGION \
  --substitutions=_TAG=$TAG

# Post-deploy verification:
# Cloud Run must allow allUsers as roles/run.invoker for the Firebase Hosting
# rewrite to serve anonymous browser requests. Auth is enforced at the app
# layer (Firebase Auth + @hellofresh.de). See SECURITY.md.
#
# Without this, Google Frontend returns a 403 BEFORE Next.js can render the
# login page, taking the whole site down (this happened on 2026-05-11).
echo ""
echo "Verifying public invoker binding..."
if gcloud run services get-iam-policy $SERVICE \
  --region=$REGION \
  --platform=managed \
  --format='value(bindings.members)' 2>/dev/null | grep -q "allUsers"; then
  echo "  allUsers has roles/run.invoker (correct)."
else
  echo "  WARNING: allUsers is missing from roles/run.invoker. Restoring..."
  gcloud run services add-iam-policy-binding $SERVICE \
    --region=$REGION \
    --platform=managed \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet
  echo "  Restored. See SECURITY.md for why this is intentional."
fi

echo ""
echo "Deployment complete."
echo "Service URL:"
gcloud run services describe $SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)'
echo "Public URL: https://hf-tasks.web.app/"
