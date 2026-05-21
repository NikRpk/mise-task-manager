#!/bin/bash

# Test Daily Task Reminders (Slack only)
# Sends sample Slack notifications to test the integration

echo "🧪 Testing Daily Task Reminders (Slack)"
echo "========================================"
echo ""

# Check if running locally or on production
if [ -z "$1" ]; then
  echo "Usage: ./scripts/test-reminders.sh [local|prod]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/test-reminders.sh local   # Test against localhost:3000"
  echo "  ./scripts/test-reminders.sh prod    # Test against production"
  exit 1
fi

if [ "$1" == "local" ]; then
  BASE_URL="http://localhost:3000"
elif [ "$1" == "prod" ]; then
  BASE_URL="https://hf-tasks.web.app"
else
  echo "❌ Invalid argument. Use 'local' or 'prod'"
  exit 1
fi

echo "🌐 Target: $BASE_URL"
echo ""

if [ -z "$TEST_EMAIL" ]; then
  echo "❌ Set TEST_EMAIL env var before running this script."
  echo "   e.g. TEST_EMAIL=you@example.com ./scripts/test-reminders.sh local"
  exit 1
fi

if [ -z "$TEST_USERNAME" ]; then
  TEST_USERNAME="Test User"
fi

echo "👤 Testing as: $TEST_EMAIL"
echo ""

# Send test request
echo "📤 Sending test request..."
echo ""

curl -X POST "$BASE_URL/api/test/daily-reminders" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"userName\": \"$TEST_USERNAME\"
  }" \
  | jq '.'

echo ""
echo "========================================"
echo "✅ Test complete!"
echo ""
echo "Check your:"
echo "  📱 Slack DMs from the Mise Task Manager bot"
echo ""
