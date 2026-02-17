#!/bin/bash

# Fast Deployment - Build locally, push to Cloud Run
# Significantly faster than remote Docker builds

set -e

PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Fast Deployment - Building locally..."
echo ""

# Verify .env.local exists for server secrets
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

# Load secrets from .env.local
GOOGLE_CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" .env.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_CLIENT_SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env.local | cut -d '=' -f2 | tr -d '"')
SLACK_BOT_TOKEN=$(grep "SLACK_BOT_TOKEN=" .env.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_REDIRECT_URI="https://hf-tasks.web.app/api/auth/google/callback"

echo "📦 Building Docker image locally..."
docker build --platform linux/amd64 -t $IMAGE_NAME:latest .

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
  --update-env-vars="GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET,GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI,SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN"

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
