#!/bin/bash

# Delete the old Cloud Run service and deploy fresh

set -e

PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"

echo "🗑️  Deleting old Cloud Run service..."
gcloud run services delete $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "Service doesn't exist or already deleted"

echo ""
echo "✅ Old service deleted. Now run ./deploy-simple.sh"
