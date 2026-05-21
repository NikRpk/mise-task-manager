#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${CLOUD_RUN_SERVICE:-mise-tasks}"
TAG=$(date +%Y%m%d-%H%M%S)

echo "Deploying to Cloud Run..."

gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --region=$REGION \
  --substitutions=_TAG=$TAG,_SERVICE_NAME=$SERVICE

# Post-deploy verification:
# Cloud Run must allow allUsers as roles/run.invoker for the Firebase Hosting
# rewrite to serve anonymous browser requests. Auth is enforced at the app
# layer. See SECURITY.md.
#
# Without this, Google Frontend returns a 403 BEFORE Next.js can render the
# login page, taking the whole site down.
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
