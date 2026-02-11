#!/bin/bash

# Grant Cloud Run service account Firebase permissions
# This allows the service to use Application Default Credentials

set -e

PROJECT_ID="dach-ai-mvps"
PROJECT_NUMBER="1014309748045"

echo "🔐 Granting Firebase permissions to Cloud Run service account..."
echo ""

# The default Cloud Run service account
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "📋 Service Account: $SERVICE_ACCOUNT"
echo ""

# Grant Firebase Admin SDK permissions
echo "✅ Granting Firebase Admin permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin" \
  --condition=None

echo ""
echo "✅ Permissions granted successfully!"
echo ""
echo "Now you can deploy with: ./deploy-simple.sh"
