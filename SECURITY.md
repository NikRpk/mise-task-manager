# Security Model

This document describes how authentication, authorization, and access control work in Mise. It exists primarily so that the next person to do a security sweep doesn't break production by "fixing" something that isn't broken.

## Architecture summary

```
User (browser)
  → Vercel Edge Network (DNS + TLS + CDN, runs Next.js middleware/SSR)
    → Next.js app (App Router, API routes run as Vercel Functions)
      → Supabase Postgres (RLS-protected tables)
      → Supabase Auth (Google OAuth + email/password)
      → Google APIs (Calendar OAuth)
      → Slack (webhooks / bot token)
```

There is no separate hosting proxy — Vercel serves the Next.js app directly, including SSR pages and `/api/**` routes.

## Authentication & authorization

Auth is enforced at the **application layer** using Supabase Auth, with Postgres Row Level Security (RLS) as a second line of defense.

### Page routes

Every page is wrapped in a Supabase Auth check (`lib/auth-context.tsx`). Unauthenticated visitors are redirected to `/login`, which supports both **Google Sign-In** and **email/password**. This is a personal deployment — there is no email-domain allow-list; anyone who signs up can create an account. Anonymous users cannot read any data.

### API routes

Every `app/api/**/route.ts` handler validates the caller's Supabase access token (JWT) via `lib/auth-middleware.ts`'s `withAuth()` helper, which calls `supabase.auth.getUser()` against the service-role client. Project-scoped routes additionally check the caller's role in the `project_members` table (VIEW / EDIT / ADMIN).

### Postgres Row Level Security

`db/schema.sql` defines RLS policies on every table (`projects`, `project_members`, `tasks`, `notes`, `note_templates`, `user_settings`, `people`) using an `is_project_member()` helper function. Even if an API route had a bug, RLS would block unauthorized reads/writes for any client using the anon key. **Server-side API routes use the `service_role` key, which bypasses RLS by design** — so the API layer (not Postgres) is the primary authorization boundary; RLS is the safety net for anything that talks to Supabase directly with the anon key (e.g. Realtime subscriptions from the browser).

## Secrets

| Secret | Where it lives |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Environment Variables (server-only, never exposed to the client) |
| `GOOGLE_CLIENT_SECRET` | Vercel Environment Variables |
| `SLACK_BOT_TOKEN` / `SLACK_FEEDBACK_WEBHOOK_URL` | Vercel Environment Variables |
| `CRON_SECRET` | Vercel Environment Variables + Vercel Cron (auto-attached as a bearer token) |

Nothing sensitive is committed to git. `.env.local` is gitignored; `.env.example` documents required variables with placeholder values only.

## Cron authentication

`/api/cron/daily-reminders` is triggered by Vercel Cron (see `vercel.json`), which sends `Authorization: Bearer $CRON_SECRET` automatically. The route checks this header explicitly so it can't be triggered by an arbitrary public request.

## Incident history

- No incidents yet on the Supabase/Vercel stack. The previous GCP/Firebase deployment's incident history (Cloud Run IAM misconfiguration) no longer applies since this app no longer runs on Cloud Run.
