#!/bin/bash

# Deploy Next.js app to Google Cloud Run
# This script builds and deploys the application to Cloud Run

set -e

echo "🚀 Deploying HelloFresh Task Manager to Google Cloud Run..."

# Configuration
PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"
PLATFORM="managed"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Build and deploy
echo "🔨 Building and deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform=$PLATFORM \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=60s \
  --service-account=firebase-adminsdk-8jn3k@dach-ai-mvps.iam.gserviceaccount.com

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
echo ""
echo "📊 View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "🔍 View in console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
