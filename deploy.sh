#!/bin/bash

# Ultra-Simple Cloud Run Deployment
# Buildpacks automatically use .env.production during build

set -e

PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"

echo "🚀 Deploying HelloFresh Task Manager to Cloud Run..."
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Verify .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production file not found"
  echo "   This file is needed for Firebase client config"
  exit 1
fi

# Verify .env.local exists for server secrets
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  echo "   This file is needed for Google Calendar OAuth secrets"
  exit 1
fi

echo "✅ Found Dockerfile - using Docker build"
echo ""

# Load Google Calendar OAuth secrets from .env.local
GOOGLE_CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" .env.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_CLIENT_SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env.local | cut -d '=' -f2 | tr -d '"')
SLACK_BOT_TOKEN=$(grep "SLACK_BOT_TOKEN=" .env.local | cut -d '=' -f2 | tr -d '"')

# Set GOOGLE_REDIRECT_URI to the production Cloud Run URL
GOOGLE_REDIRECT_URI="https://$SERVICE_NAME-4e5l57e4iq-ew.a.run.app/api/auth/google/callback"

echo "🔨 Building and deploying with Docker..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=60s \
  --clear-base-image \
  --update-env-vars="GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI,SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
