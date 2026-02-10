#!/bin/bash

# Build and push Docker image locally, then deploy to Cloud Run
# This approach gives more control and avoids Cloud Build permission issues

set -e

echo "🚀 Deploying HelloFresh Task Manager to Google Cloud Run..."
echo ""

# Configuration
PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Configure Docker to use gcloud as credential helper
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker

# Build the Docker image locally
echo "🔨 Building Docker image locally..."
docker build --platform linux/amd64 -t $IMAGE_NAME:latest .

# Push to Google Container Registry
echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
echo ""
echo "📊 View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "🔍 View in console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
