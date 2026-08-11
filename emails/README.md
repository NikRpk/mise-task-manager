# Mise transactional emails

Supabase Auth sends a handful of transactional emails (confirmation, password
reset, magic link, etc.). This folder holds the branded HTML for those, kept
in the repo instead of only living inside the Supabase Dashboard.

## Structure

- `theme.json` — the color tokens (single source of truth). Edit this to
  change colors globally.
- `templates/base-cta.html` — base layout for emails with a single
  call-to-action button (confirmation, recovery, magic link). Uses CSS
  variables for live preview; not what gets sent (see `build.js`).
- `templates/base-notice.html` — base layout for informational emails with
  no button (e.g. "your password was changed").
- `playground.html` — open this directly in a browser to try out colors with
  live color pickers before committing to values in `theme.json`.
- `build.js` — reads `theme.json` + the per-email copy defined inside it, and
  writes fully inline-styled HTML to `output/*.html`. Supabase's mailer (and
  Outlook) don't reliably support `<style>` blocks, so the shipped HTML must
  have every rule inlined as `style="..."`.
- `output/*.html` — generated. Paste these into the Supabase Dashboard
  (**Authentication → Emails → Templates**), or push via the Management API.

## Workflow

1. Open `emails/playground.html` in a browser. Pick a color from the dropdown
   for each slot (or "Custom..." to type any hex). Click "Copy theme.json" to
   copy the resulting values.
2. Paste the copied values into `emails/theme.json`.
3. Run:

   ```bash
   npm run emails:build
   ```

4. Review `emails/output/*.html`, then either paste each into the matching
   Supabase template (Confirm signup / Reset password / Magic link) in the
   Dashboard, or run `bash emails/push-to-supabase.sh` to push all three via
   the Management API.

## ⚠️ Free tier limitation

Supabase **rejects custom email template edits on the free plan** unless a
custom SMTP provider is configured:

```
"Email template modification is not available for free tier projects
using the default email provider. Please upgrade your plan or configure
a custom SMTP provider."
```

To unlock custom templates without paying for Supabase Pro, set up free
custom SMTP under **Authentication → Emails → SMTP Settings**. Options with a
free tier generous enough for a personal app:

- **[Resend](https://resend.com)** — 3,000 emails/month free, easiest to set
  up, works well with Supabase's SMTP settings.
- **[Brevo](https://www.brevo.com)** (formerly Sendinblue) — 300 emails/day
  free.

Once SMTP is configured, `emails/push-to-supabase.sh` will work as-is. Until
then, Supabase keeps sending its default plain-text emails and
`emails/output/*.html` just sits ready to go.

## Adding a new email

1. Add a new entry to the `EMAILS` map in `build.js` with `subject`,
   `heading`, `body`, `footer`, and (for CTA-style emails) `button`.
2. Pick `renderCta` or `renderNotice` depending on whether it needs a button.
3. Re-run `npm run emails:build`.
