#!/bin/bash

# Fast Deployment - Build locally, push to Cloud Run
# Compatible with Docker Desktop or Colima
# Uses HelloFresh Artifactory for base images

set -e

PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Fast Deployment - Building locally..."
echo ""

# Check if Docker (or Colima) is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running"
  echo "   Please start Docker Desktop or Colima:"
  echo "   → colima start"
  exit 1
fi

# Clean up old Docker images and build cache
echo "🧹 Cleaning up old Docker images and cache..."
docker system prune -f --filter "until=24h"
echo ""

# Verify .env.production.local exists for server secrets
if [ ! -f .env.production.local ]; then
  echo "❌ Error: .env.production.local file not found"
  echo "   This file should contain:"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - GOOGLE_CLIENT_SECRET"
  echo "   - SLACK_BOT_TOKEN"
  exit 1
fi

# Load secrets from .env.production.local
GOOGLE_CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" .env.production.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_CLIENT_SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env.production.local | cut -d '=' -f2 | tr -d '"')
SLACK_BOT_TOKEN=$(grep "SLACK_BOT_TOKEN=" .env.production.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_REDIRECT_URI="https://hf-tasks.web.app/api/auth/google/callback"

echo "📦 Building Docker image locally (using Artifactory mirror)..."
docker build --platform linux/amd64 -f Dockerfile.artifactory -t $IMAGE_NAME:latest .

echo "⬆️  Pushing image to Google Container Registry..."
docker push $IMAGE_NAME:latest

echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=60s \
  --update-env-vars="GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI,SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN,NEXT_PUBLIC_APP_URL=https://hf-tasks.web.app"

echo ""
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting:hf-tasks --project $PROJECT_ID

echo ""
echo "✅ Fast deployment complete!"
echo ""
echo "🌐 Your app is live at:"
echo "   Cloud Run: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")"
echo "   Firebase:  https://hf-tasks.web.app"
echo ""
