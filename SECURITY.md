# Security Model

This document describes how authentication, authorization, and access control work in `hf-tasks` (Mise). It exists primarily so that:

1. The next person to do a security sweep doesn't break production by "fixing" something that isn't broken.
2. Wiz / HelloFresh Security have a written justification for the architectural decisions documented here.

## Architecture summary

```
User (browser)
  → Firebase Hosting (DNS + TLS + CDN, no app logic)
    → Cloud Run: hf-tasks (Next.js standalone, public invoker)
      → Firestore (database: task-and-note-manager)
      → Secret Manager (OAuth client credentials, Slack webhook)
      → Google APIs (Calendar, OAuth)
```

Firebase Hosting does **not** run code. All auth, page rendering, and API logic runs inside the Next.js container on Cloud Run.

## Authentication & authorization

Auth is enforced at the **application layer**, not at the IAM / Cloud Run invoker layer.

### Page routes

Every page is wrapped in a Firebase Auth check. Unauthenticated visitors are redirected to `/login`, which only accepts Google Sign-In with `@hellofresh.de` (and configured HF subsidiary domains). Anonymous users see the login page; they cannot read any data.

### API routes

Every `app/api/**/route.ts` handler validates the caller's Firebase ID token and rejects requests where the token's `email` is not on the HelloFresh domain allow-list. See `lib/auth-check.ts` (or equivalent) for the canonical helper. The `api-auth-enforcement` skill is the source of truth for the pattern.

### Firestore

Firestore security rules (`firestore.rules`) enforce per-user and per-project ownership independently of the API layer. Even if an API route had a bug, the rules would block unauthorized access. This is the second layer of defense.

## IAM model

### Cloud Run invoker (`roles/run.invoker` on `hf-tasks`)

| Member | Purpose |
|---|---|
| `allUsers` | **Required.** Firebase Hosting forwards anonymous browser requests on `hf-tasks.web.app`. Without this, Google Frontend (GFE) returns a `403 Forbidden` page before Next.js can render `/login`, taking the entire site down for everyone. App-layer auth then gates everything past `/login`. |
| `firebase-hosting@system.gserviceaccount.com` | Default Firebase Hosting → Cloud Run binding. Kept for completeness; not sufficient on its own for browser traffic. |
| `scheduler-invoker@dach-ai-mvps.iam.gserviceaccount.com` | Used by Cloud Scheduler to invoke `/api/cron/daily-reminders` with an OIDC-signed request. |

**Why `allUsers` is intentional, despite Wiz flagging it:**

- The `deploying-nextjs-to-cloud-run` HelloFresh skill explicitly documents `--allow-unauthenticated` as the correct setting for Next.js + Firebase Hosting + Cloud Run.
- "Public" at the IAM layer does not mean "public" at the application layer. Every page and API route requires a Firebase ID token from an `@hellofresh.de` user.
- Headless Cloud Run services (webhook receivers, internal-only APIs) should use `--no-allow-unauthenticated`. `hf-tasks` is not headless — it is an interactive web app whose login page must be reachable by anonymous browsers.

### Runtime service account (`hf-tasks-runner@dach-ai-mvps.iam.gserviceaccount.com`)

Roles granted at the project level:

- `roles/datastore.user` — read/write the `task-and-note-manager` Firestore database
- `roles/secretmanager.secretAccessor` — read OAuth and webhook secrets

This is least-privilege per the `gcp-least-privilege` skill. No `Owner`, `Editor`, or wildcard roles. If Wiz flags this account as "high privilege", the alert is miscalibrated.

## Secrets

All secrets live in Secret Manager and are injected into Cloud Run at deploy time (see `cloudbuild.yaml`'s `--update-secrets` flag). Nothing sensitive is committed to git. `.env.local` is gitignored.

## Wiz alert response policy

When Wiz flags `hf-tasks` for "publicly accessible Cloud Run":

1. Confirm the alert is referring to `hf-tasks` (not a different service).
2. Mark the issue as **"Risk Accepted"** in Wiz with a justification that links to this file.
3. **Do not** remove `allUsers` from `roles/run.invoker`. Doing so will take the site offline within seconds (GFE returns 403 before Next.js can render anything).

If a future security review concludes that public invoker is no longer acceptable, the correct migration is:

1. Replace the Firebase Hosting → Cloud Run rewrite with Identity-Aware Proxy (IAP) in front of Cloud Run, OR
2. Move the login page to a separate fully-static Firebase Hosting path that exchanges Firebase Auth tokens for OIDC-signed requests to Cloud Run.

Both are non-trivial. Coordinate with Niklas Röpke before starting.

## Incident history

- **2026-05-11 11:52 UTC** — `allUsers` was removed from `roles/run.invoker` during a security cleanup. Site returned `403 Forbidden` (Google Frontend) for ~24 hours until restored. Root cause: `cloudbuild.yaml` had `--no-allow-unauthenticated` hardcoded, so even if IAM was patched the next deploy would re-introduce the regression. Fix: changed flag to `--allow-unauthenticated`, added post-deploy verification step in `deploy.sh`, wrote this document.
