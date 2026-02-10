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

# Load Firebase public config from .env.local (remove quotes)
echo "📦 Loading Firebase configuration..."
export $(grep "^NEXT_PUBLIC_FIREBASE" .env.local | sed 's/"//g' | xargs)

# Verify variables are loaded
if [ -z "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then
    echo "❌ Error: Failed to load Firebase configuration from .env.local"
    exit 1
fi

echo "✅ Loaded Firebase API Key: ${NEXT_PUBLIC_FIREBASE_API_KEY:0:10}..."

# Create substitutions for Cloud Build
SUBSTITUTIONS="_NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
SUBSTITUTIONS="$SUBSTITUTIONS,_NEXT_PUBLIC_DEV_MODE=false"

# Create a temporary cloudbuild.yaml with the config
cat > /tmp/cloudbuild-deploy.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_API_KEY=\${_NEXT_PUBLIC_FIREBASE_API_KEY}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\${_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_PROJECT_ID=\${_NEXT_PUBLIC_FIREBASE_PROJECT_ID}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=\${_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=\${_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_APP_ID=\${_NEXT_PUBLIC_FIREBASE_APP_ID}'
      - '--build-arg=NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=\${_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}'
      - '--build-arg=NEXT_PUBLIC_DEV_MODE=\${_NEXT_PUBLIC_DEV_MODE}'
      - '-t'
      - 'europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME:latest'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME:latest'

images:
  - 'europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME:latest'

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
EOF

echo "🔨 Building image with Firebase configuration..."
gcloud builds submit \
  --config=/tmp/cloudbuild-deploy.yaml \
  --substitutions="$SUBSTITUTIONS" \
  --region=$REGION \
  .

echo "📤 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=europe-west1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME:latest \
  --platform=$PLATFORM \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=60s

# Clean up temp file
rm /tmp/cloudbuild-deploy.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
echo "🌐 Firebase Hosting: https://hf-tasks.web.app"
echo ""
echo "📊 View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "🔍 View in console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
