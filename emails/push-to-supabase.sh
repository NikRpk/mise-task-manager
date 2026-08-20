#!/bin/bash
# Pushes the generated emails/output/*.html templates to Supabase Auth config
# via the Management API.
#
# ⚠️ Supabase's free tier rejects custom email template edits unless a custom
# SMTP provider is configured (Authentication -> Emails -> SMTP Settings).
# See emails/README.md for free SMTP provider options. Until then this script
# will fail with: "Email template modification is not available for free
# tier projects using the default email provider."
#
# Requires SUPABASE_PROJECT_ID and SUPABASE_TOKEN (a personal access token,
# see https://supabase.com/dashboard/account/tokens) in the environment or a
# .env.local file in the repo root.
#
# Usage:
#   npm run emails:build   # regenerate emails/output/*.html first
#   bash emails/push-to-supabase.sh
set -e

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_TOKEN" ]; then
  echo "Missing SUPABASE_PROJECT_ID or SUPABASE_TOKEN (set in .env.local or the environment)." >&2
  exit 1
fi

payload_file=$(mktemp)
python3 - <<'PYEOF' > "$payload_file"
import json

def read_html(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

payload = {
    "mailer_subjects_confirmation": "Confirm your email for Mise",
    "mailer_templates_confirmation_content": read_html("emails/output/confirmation.html"),
    "mailer_subjects_recovery": "Reset your Mise password",
    "mailer_templates_recovery_content": read_html("emails/output/recovery.html"),
    "mailer_subjects_magic_link": "Your Mise sign-in link",
    "mailer_templates_magic_link_content": read_html("emails/output/magic_link.html"),
}
print(json.dumps(payload))
PYEOF

http_code=$(curl -s -o /tmp/supabase_email_resp.json -w "%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$payload_file")

echo "HTTP $http_code"
if [ "$http_code" != "200" ]; then
  cat /tmp/supabase_email_resp.json
  echo
  rm -f "$payload_file" /tmp/supabase_email_resp.json
  exit 1
fi

echo "Templates pushed."
rm -f "$payload_file" /tmp/supabase_email_resp.json
