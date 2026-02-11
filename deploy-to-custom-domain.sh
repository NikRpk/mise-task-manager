#!/bin/bash

# Deploy to Cloud Run AND Firebase Hosting (custom domain)
# This makes the app available at https://hf-tasks.web.app/

set -e

PROJECT_ID="dach-ai-mvps"
SERVICE_NAME="hf-tasks"
REGION="europe-west1"

echo "🚀 Deploying HelloFresh Task Manager to Custom Domain..."
echo ""

# Step 1: Deploy to Cloud Run
echo "📦 Step 1/2: Deploying to Cloud Run..."
./deploy.sh

echo ""
echo "🌐 Step 2/2: Deploying Firebase Hosting..."

# Deploy Firebase Hosting (which proxies to Cloud Run)
firebase deploy --only hosting:hf-tasks --project $PROJECT_ID

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://hf-tasks.web.app/"
echo ""
