#!/bin/bash

# Test script to verify Slack notifications are working
# This sends a test notification directly to your Slack webhook

WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"
FUNCTION_URL="${FUNCTION_URL:-https://europe-west1-dach-ai-mvps.cloudfunctions.net/onHostingDeploy}"

echo "🧪 Testing Slack Notification System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Direct webhook test
echo "Test 1: Testing direct webhook connection..."
echo ""

RESPONSE=$(curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "service_url": "https://hf-tasks.web.app",
    "deployment_time": "'"$(date '+%d.%m.%Y at %H:%M')"'",
    "version": "test-v1.0.0",
    "status": "✅ Success",
    "app": "hf-tasks (TEST)",
    "environment": "test",
    "deployer": "test@example.com"
  }' \
  --write-out "\nHTTP_STATUS:%{http_code}" \
  --silent)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Direct webhook test PASSED"
  echo "   Check your Slack channel for the test message!"
else
  echo "❌ Direct webhook test FAILED (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Cloud Function test (if deployed)
echo "Test 2: Testing via Cloud Function..."
echo ""

DEPLOYER_EMAIL=$(git config user.email 2>/dev/null || echo "test@example.com")
DEPLOYER_NAME=$(git config user.name 2>/dev/null || echo "Test User")

RESPONSE=$(curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "deployer": "'"$DEPLOYER_NAME"'",
    "deployerEmail": "'"$DEPLOYER_EMAIL"'",
    "appName": "hf-tasks (TEST via Function)",
    "version": "test-function-v1.0.0",
    "environment": "test",
    "serviceUrl": "https://hf-tasks.web.app",
    "success": true
  }' \
  --write-out "\nHTTP_STATUS:%{http_code}" \
  --silent)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Cloud Function test PASSED"
  echo "   Check your Slack channel for the second test message!"
else
  echo "⚠️  Cloud Function test FAILED (HTTP $HTTP_STATUS)"
  echo "   This is expected if you haven't deployed the function yet."
  echo "   Run: npm run firebase:deploy:functions"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Failure notification test
echo "Test 3: Testing failure notification..."
echo ""

RESPONSE=$(curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "service_url": "https://hf-tasks.web.app",
    "deployment_time": "'"$(date '+%d.%m.%Y at %H:%M')"'",
    "version": "test-failure-v1.0.0",
    "status": "❌ Failed - This is a test error message - deployment simulation failed",
    "app": "hf-tasks (FAILURE TEST)",
    "environment": "test",
    "deployer": "test@example.com"
  }' \
  --write-out "\nHTTP_STATUS:%{http_code}" \
  --silent)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Failure notification test PASSED"
  echo "   Check your Slack channel for the failure test message!"
else
  echo "❌ Failure notification test FAILED (HTTP $HTTP_STATUS)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Testing complete!"
echo ""
echo "Next steps:"
echo "  • Check your Slack channel for the test messages"
echo "  • If tests passed, you're ready to use: ./deploy-firebase.sh"
echo "  • If tests failed, verify your webhook URL is correct"
echo ""
