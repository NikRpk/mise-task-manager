#!/bin/bash

# One-time setup: Store secrets in Google Secret Manager
# Run this once before using Cloud Build

set -e

PROJECT_ID="dach-ai-mvps"

echo "🔐 Setting up secrets in Google Secret Manager..."
echo ""

if [ ! -f .env.production.local ]; then
  echo "❌ Error: .env.production.local not found"
  echo "   Create this file with your secrets first"
  exit 1
fi

# Load secrets from .env.production.local
GOOGLE_CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" .env.production.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_CLIENT_SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env.production.local | cut -d '=' -f2 | tr -d '"')
SLACK_BOT_TOKEN=$(grep "SLACK_BOT_TOKEN=" .env.production.local | cut -d '=' -f2 | tr -d '"')
GOOGLE_REDIRECT_URI="https://hf-tasks.web.app/api/auth/google/callback"

# Function to create or update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2
  
  echo "📝 Setting up $secret_name..."
  
  # Check if secret exists
  if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
    echo "   Secret exists, adding new version..."
    echo -n "$secret_value" | gcloud secrets versions add $secret_name \
      --data-file=- \
      --project=$PROJECT_ID
  else
    echo "   Creating new secret..."
    echo -n "$secret_value" | gcloud secrets create $secret_name \
      --data-file=- \
      --replication-policy="automatic" \
      --project=$PROJECT_ID
  fi
  
  echo "   ✅ $secret_name configured"
}

# Create/update all secrets
create_or_update_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
create_or_update_secret "SLACK_BOT_TOKEN" "$SLACK_BOT_TOKEN"
create_or_update_secret "GOOGLE_REDIRECT_URI" "$GOOGLE_REDIRECT_URI"

echo ""
echo "✅ All secrets configured!"
echo ""
echo "🔒 Secrets stored securely in Google Secret Manager"
echo "   They can now be used by Cloud Build and Cloud Run"
echo ""
echo "💡 To update secrets later, just run this script again"
echo ""
