# Security Model

This document describes how authentication, authorization, and access control work in Mise. It exists primarily so that the next person to do a security sweep doesn't break production by "fixing" something that isn't broken.

## Architecture summary

```
User (browser)
  → Firebase Hosting (DNS + TLS + CDN, no app logic)
    → Cloud Run: mise-tasks (Next.js standalone, public invoker)
      → Firestore (database: task-and-note-manager)
      → Secret Manager (OAuth client credentials, Slack webhook)
      → Google APIs (Calendar, OAuth)
```

Firebase Hosting does **not** run code. All auth, page rendering, and API logic runs inside the Next.js container on Cloud Run.

## Authentication & authorization

Auth is enforced at the **application layer**, not at the IAM / Cloud Run invoker layer.

### Page routes

Every page is wrapped in a Firebase Auth check. Unauthenticated visitors are redirected to `/login`, which only accepts Google Sign-In. The allowed domain(s) are configured via the `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` environment variable. Anonymous users see the login page; they cannot read any data.

### API routes

Every `app/api/**/route.ts` handler validates the caller's Firebase ID token and rejects requests where the token's `email` does not match the configured domain allow-list. See `lib/auth-middleware.ts` for the canonical helper.

### Firestore

Firestore security rules (`firestore.rules`) enforce per-user and per-project ownership independently of the API layer. Even if an API route had a bug, the rules would block unauthorized access. This is the second layer of defense.

## IAM model

### Cloud Run invoker (`roles/run.invoker`)

| Member | Purpose |
|---|---|
| `allUsers` | **Required.** Firebase Hosting forwards anonymous browser requests to Cloud Run. Without this, Google Frontend (GFE) returns a `403 Forbidden` page before Next.js can render `/login`, taking the entire site down for everyone. App-layer auth then gates everything past `/login`. |
| `firebase-hosting@system.gserviceaccount.com` | Default Firebase Hosting → Cloud Run binding. |
| `scheduler-invoker@<project>.iam.gserviceaccount.com` | Used by Cloud Scheduler to invoke `/api/cron/daily-reminders` with an OIDC-signed request. |

**Why `allUsers` is intentional:**

- "Public" at the IAM layer does not mean "public" at the application layer. Every page and API route requires a valid Firebase ID token.
- Headless Cloud Run services (webhook receivers, internal-only APIs) should use `--no-allow-unauthenticated`. This app is not headless — its login page must be reachable by anonymous browsers.

### Runtime service account

Roles granted at the project level:

- `roles/datastore.user` — read/write the `task-and-note-manager` Firestore database
- `roles/secretmanager.secretAccessor` — read OAuth and webhook secrets

This is least-privilege. No `Owner`, `Editor`, or wildcard roles.

## Secrets

All secrets live in Secret Manager and are injected into Cloud Run at deploy time (see `cloudbuild.yaml`'s `--update-secrets` flag). Nothing sensitive is committed to git. `.env.local` is gitignored.

## Incident history

- **2026-05-11 11:52 UTC** — `allUsers` was removed from `roles/run.invoker` during a security cleanup. Site returned `403 Forbidden` (Google Frontend) for ~24 hours until restored. Root cause: `cloudbuild.yaml` had `--no-allow-unauthenticated` hardcoded, so even if IAM was patched the next deploy would re-introduce the regression. Fix: changed flag to `--allow-unauthenticated`, added post-deploy verification step in `deploy.sh`, wrote this document.
