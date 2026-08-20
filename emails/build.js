#!/usr/bin/env node
/**
 * Builds Supabase-ready (fully inline-styled) email HTML from:
 *   - emails/theme.json          (color tokens)
 *   - emails/templates/*.html    (structure/copy placeholders, for reference/preview)
 *   - the CONTENT map below      (per-email copy)
 *
 * Supabase's mailer (and Outlook desktop in general) doesn't reliably support
 * <style> blocks, so this inlines every rule into style="..." attributes.
 * The base-*.html files in emails/templates/ are kept in sync manually — if you
 * change the layout there, mirror the change in the STYLES map below.
 *
 * Usage:
 *   node emails/build.js
 *
 * Output:
 *   emails/output/confirmation.html
 *   emails/output/recovery.html
 *   emails/output/magic_link.html
 *   emails/output/password_changed.html
 *
 * These are ready to paste into the Supabase Dashboard
 * (Authentication -> Emails -> Templates), or push via the Management API.
 */
const fs = require('fs');
const path = require('path');

const themePath = path.join(__dirname, 'theme.json');
const outputDir = path.join(__dirname, 'output');

const theme = JSON.parse(fs.readFileSync(themePath, 'utf8')).colors;

function c(key) {
  if (!theme[key]) throw new Error(`Unknown theme color key: ${key}`);
  return theme[key].value;
}

// Mirrors the <style> block in templates/base-cta.html and templates/base-notice.html.
function styles() {
  return {
    body: `margin:0;padding:0;background-color:${c('porcelain')};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;`,
    page: `background-color:${c('porcelain')};`,
    cell: `padding:40px 16px;`,
    card: `max-width:480px;width:100%;background-color:${c('cardBackground')};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,51,102,0.10);`,
    accentBarCta: `background-color:${c('amber')};height:6px;line-height:6px;font-size:0;`,
    accentBarNotice: `background-color:${c('raspberry')};height:6px;line-height:6px;font-size:0;`,
    brandRow: `padding:28px 40px 0 40px;`,
    brandDot: `display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${c('lime')};margin-right:8px;vertical-align:middle;`,
    brandName: `font-size:20px;font-weight:700;color:${c('navy')};letter-spacing:-0.02em;vertical-align:middle;`,
    heading: `margin:0;padding:24px 40px 8px 40px;font-size:22px;line-height:1.3;color:${c('navy')};font-weight:600;`,
    bodyTextCta: `margin:0;padding:0 40px 24px 40px;font-size:15px;line-height:1.6;color:${c('navyMuted')};`,
    bodyTextNotice: `margin:0;padding:0 40px 32px 40px;font-size:15px;line-height:1.6;color:${c('navyMuted')};`,
    buttonRow: `padding:0 40px 32px 40px;`,
    ctaButton: `display:inline-block;background-color:${c('amber')};color:${c('navy')};text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:8px;`,
    fallbackRow: `padding:20px 40px 32px 40px;border-top:1px solid ${c('border')};`,
    fallbackLabel: `margin:0;font-size:13px;line-height:1.6;color:${c('navyMuted')};`,
    fallbackUrl: `margin:8px 0 0 0;font-size:13px;line-height:1.6;word-break:break-all;`,
    fallbackLink: `color:${c('raspberry')};`,
    footer: `margin:24px 0 0 0;font-size:12px;color:${c('navyMuted')};text-align:center;`,
  };
}

function renderCta({ subject, heading, body, button, footer, url = '{{ .ConfirmationURL }}' }) {
  const s = styles();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="${s.body}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${s.page}">
    <tr>
      <td align="center" style="${s.cell}">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="${s.card}">
          <tr><td style="${s.accentBarCta}">&nbsp;</td></tr>
          <tr>
            <td style="${s.brandRow}">
              <span style="${s.brandDot}">&nbsp;</span>
              <span style="${s.brandName}">Mise</span>
            </td>
          </tr>
          <tr><td><h1 style="${s.heading}">${heading}</h1></td></tr>
          <tr><td><p style="${s.bodyTextCta}">${body}</p></td></tr>
          <tr>
            <td style="${s.buttonRow}">
              <a href="${url}" style="${s.ctaButton}">${button}</a>
            </td>
          </tr>
          <tr>
            <td style="${s.fallbackRow}">
              <p style="${s.fallbackLabel}">If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="${s.fallbackUrl}"><a href="${url}" style="${s.fallbackLink}">${url}</a></p>
            </td>
          </tr>
        </table>
        <p style="${s.footer}">${footer}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderNotice({ subject, heading, body, footer }) {
  const s = styles();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="${s.body}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${s.page}">
    <tr>
      <td align="center" style="${s.cell}">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="${s.card}">
          <tr><td style="${s.accentBarNotice}">&nbsp;</td></tr>
          <tr>
            <td style="${s.brandRow}">
              <span style="${s.brandDot}">&nbsp;</span>
              <span style="${s.brandName}">Mise</span>
            </td>
          </tr>
          <tr><td><h1 style="${s.heading}">${heading}</h1></td></tr>
          <tr><td><p style="${s.bodyTextNotice}">${body}</p></td></tr>
        </table>
        <p style="${s.footer}">${footer}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const EMAILS = {
  confirmation: {
    render: renderCta,
    subject: 'Confirm your email for Mise',
    heading: 'Confirm your email',
    body: 'Welcome to Mise! Click below to confirm your email address and finish setting up your account.',
    button: 'Confirm email address',
    footer: "If you didn't create an account, you can safely ignore this email.",
  },
  recovery: {
    render: renderCta,
    subject: 'Reset your Mise password',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for your Mise account. Click below to choose a new one &mdash; this link will expire shortly.',
    button: 'Reset password',
    footer: "If you didn't request this, you can safely ignore this email &mdash; your password won't change.",
  },
  magic_link: {
    render: renderCta,
    subject: 'Your Mise sign-in link',
    heading: 'Your sign-in link',
    body: 'Click below to sign in to Mise. This link expires shortly and can only be used once.',
    button: 'Sign in to Mise',
    footer: "If you didn't request this, you can safely ignore this email.",
  },
  password_changed: {
    render: renderNotice,
    subject: 'Your Mise password was changed',
    heading: 'Your password was changed',
    body: 'The password for your Mise account was recently changed. If you made this change, no action is needed.',
    footer: "If you didn't make this change, reset your password immediately from the login page.",
  },
};

fs.mkdirSync(outputDir, { recursive: true });

for (const [key, def] of Object.entries(EMAILS)) {
  const html = def.render(def);
  const outPath = path.join(outputDir, `${key}.html`);
  fs.writeFileSync(outPath, html);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}
