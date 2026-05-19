#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_NAME="${APP_NAME:-hf-tasks}"
DEPLOYER="${DEPLOYER:-$(whoami)}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SERVICE_URL="${SERVICE_URL:-https://hf-tasks.web.app}"

VERSION=$(date +%Y%m%d-%H%M%S)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Starting Firebase Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 App:         ${APP_NAME}${NC}"
echo -e "${BLUE}👤 Deployer:    ${DEPLOYER}${NC}"
echo -e "${BLUE}🌍 Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📦 Version:     ${VERSION}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Slack notifications are handled automatically by the `onCloudBuildComplete`
# Pub/Sub function in functions/src/index.ts — no manual HTTP call needed here.

echo -e "${YELLOW}📦 Running tests...${NC}"
if ! npm run test:ci; then
  echo -e "${RED}❌ Tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Tests passed${NC}"
echo ""

echo -e "${YELLOW}🏗️  Building application...${NC}"
if ! npm run build; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Deploy to Cloud Run (builds Docker image via Cloud Build)
echo -e "${YELLOW}🐳 Building and deploying to Cloud Run...${NC}"
PROJECT_ID="dach-ai-mvps"
REGION="europe-west1"
TAG=$(date +%Y%m%d-%H%M%S)
if ! gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --region=$REGION \
  --substitutions=_TAG=$TAG; then
  echo -e "${RED}❌ Cloud Run deployment failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Cloud Run deployment successful${NC}"
echo ""

# Deploy to Firebase Hosting (updates CDN/routing config)
echo -e "${YELLOW}🔥 Deploying to Firebase Hosting...${NC}"
if ! firebase deploy --only hosting; then
  echo -e "${RED}❌ Firebase Hosting deployment failed!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
