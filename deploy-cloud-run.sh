#!/bin/bash

# Deploy Next.js app to Google Cloud Run
# This script builds and deploys the application to Cloud Run with Firebase config

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

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with Firebase configuration"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Load Firebase public config from .env.local
echo "📦 Loading Firebase configuration..."
source <(grep "^NEXT_PUBLIC_FIREBASE" .env.local | sed 's/"//g')

# Build and deploy with build args
echo "🔨 Building image with Firebase configuration..."
gcloud builds submit \
  --region=$REGION \
  --tag=europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME \
  --build-arg=NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg=NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg=NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg=NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg=NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg=NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg=NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" \
  --build-arg=NEXT_PUBLIC_DEV_MODE="false"

echo "📤 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME \
  --platform=$PLATFORM \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=60s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
echo ""
echo "📊 View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "🔍 View in console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
