# bolmso.app Platform — Project Context

This file is a shared, cross-repo knowledge base for AI agents working on any app in the
`bolmso.app` platform. It captures architectural decisions and conventions learned across past
sessions so they don't have to be re-discovered (or re-argued) each time. It is intentionally
kept in sync across every app repo on this platform — if you learn something here that's still
true, also update the copy in the other repos (see "Repos" below).

## Platform overview

`bolmso.app` is a personal multi-app platform (owner: Niklas Röpke). Each app lives at its own
subdomain and is a separate Next.js project / GitHub repo / Vercel project, but several pieces
of infrastructure are intentionally **shared**, not duplicated per app:

- **One Supabase project** ("Bolmsö", project ref `obdutfmhngxtfmqtgica`) hosts every app's
  data and a single Supabase Auth instance — so one login works across every `*.bolmso.app` app.
- **One Vercel team** (`nikrpks-projects`, team id `team_iMnk3apFtTLb8CeT7VTxobU6`) hosts every
  app's Vercel project.
- **One GitHub account** (`NikRpk`) with one repo per app.
- Usual deploy targets for new apps: **Supabase + Vercel + Cloudflare** (DNS).

## Current app registry

| Domain | Repo | Vercel project | Notes |
|---|---|---|---|
| `bolmso.app`, `www.bolmso.app` | [`NikRpk/bolmso-hub`](https://github.com/NikRpk/bolmso-hub) | `bolmso-hub` | Directory/landing page only. **Never hosts an app itself** — `bolmso.app` redirects (308) to `www.bolmso.app`. |
| `mise.bolmso.app` | [`NikRpk/mise-task-manager`](https://github.com/NikRpk/mise-task-manager) | `mise-task-manager` | Task/notes manager. Originally scaffolded on Firebase; now Next.js + Supabase. Used to also occupy `bolmso.app`/`www.bolmso.app` before the hub existed — that's been cut over. |
| `bets.bolmso.app` | [`NikRpk/betting-site`](https://github.com/NikRpk/betting-site) | `betting-site` | This repo — "The Ledger", a bet-tracking app for the admin and friends. |

New apps are expected to follow the same pattern: their own repo, their own Vercel project, a
new `<name>.bolmso.app` subdomain, and (per the DB conventions below) prefixed tables in the
same shared Supabase project rather than a new project.

### How the hub directory auto-discovers new apps

`bolmso-hub` never keeps a hardcoded list of apps. On every render (ISR, 5 min) it calls the
Vercel REST API: list every project in the team, list each project's domains, keep the ones that
are **verified** and end in `.bolmso.app` (excluding the hub's own domains via a `HUB_DOMAINS`
env var), then live-pings each one for a status dot. A `POST /api/refresh` route (HMAC-SHA1
`x-vercel-signature`-verified) is wired to a Vercel team webhook on `deployment.succeeded` /
`project.domain.verified` for near-instant updates instead of waiting for ISR.

**Consequence for new apps:** the only thing a new app needs to do to show up in the directory
is have a verified `*.bolmso.app` domain attached to its Vercel project. No manifest, no
registration step, no redeploy of the hub.

## Shared Supabase conventions

- **No per-app Postgres schemas.** Everything lives in the `public` schema. Reasoning: Supabase's
  REST API only exposes schemas explicitly listed in the project's `api.schemas` setting, so a
  schema-per-app split would require adding each schema there *and* changing every Supabase
  client call in every app to `.schema('appname').from(...)` — real code churn with no added
  security, since RLS already isolates access per table regardless of schema.
- **Tables/functions/triggers are prefixed per app instead**, e.g. `bet_*` (betting-site),
  `mise_*` (mise-task-manager). This gives the same collision-avoidance as schemas with zero
  extra client-code complexity.
- **`public.users`** is the one shared, cross-app master identity table (not owned by any single
  app's repo/migrations — currently documented in `mise-task-manager`'s `db/schema.sql` since
  that's the repo it was first created alongside). One row per `auth.users` row, holding *only*
  fields every app might care about: `id`, `email`, `display_name`, `avatar_url`, `created_at`,
  `updated_at`. Populated by its own signup trigger (`handle_new_master_user` /
  `on_auth_user_created_master_user` on `auth.users`), independent of any app's own signup
  trigger. RLS: readable by anyone, updatable only by the owning user (`auth.uid() = id`).
- **App-specific profile tables intentionally do NOT foreign-key off `public.users`.** They key
  directly off `auth.users(id)`, same as before `public.users` existed (e.g. `bet_profiles`,
  `mise_user_settings`). This means no app has a hard runtime dependency on another app's signup
  trigger firing (or firing in a particular order) — each app's own trigger is independent.
  App-specific data (e.g. `bet_profiles.is_admin`, mise's notification prefs) stays in each app's
  own table; only truly cross-app fields belong in `public.users`.
- **History:** mise's original `user_settings` table was renamed to `mise_user_settings`
  (along with its index, `updated_at` trigger, and signup function/trigger) specifically to
  avoid ambiguity once `public.users` was introduced as the shared table name.
- **Supabase Management API gotcha:** `ALTER TRIGGER ... ON auth.users RENAME TO ...` fails with
  a permissions/ownership error even for otherwise-privileged connections, but `DROP TRIGGER`
  followed by `CREATE TRIGGER` (recreating it under the new name, pointing at the same or a
  renamed function) works fine. Postgres applies different privilege checks to the two
  statements. Same idea applies to `ALTER INDEX`/`ALTER TRIGGER` on other `auth.*`-owned objects.

## Cross-repo code conventions

- `next.config.ts` sets `agentRules: false` (matches across all app repos; scaffold-generated
  `AGENTS.md`/`CLAUDE.md` files are deleted from fresh `create-next-app` scaffolds too).
- `.gitignore` pattern for env files: `.env*` then `!.env.example` so the example file is
  trackable while real secrets never are.
- Before any push: scan the diff for secret-shaped strings (`AIza`, `ghp_`, `sk-`,
  `BEGIN PRIVATE KEY`, Vercel tokens `vcp_...`, Supabase tokens `sbp_...`) as a last check.
- Admin bootstrapping pattern: a specific email (`nsropke@gmail.com`) is granted admin rights via
  the signup trigger itself (e.g. `bet_profiles.is_admin` set to true when `new.email` matches),
  rather than a manual post-signup step.

## Known stale items / follow-ups

- `mise-task-manager`'s Vercel `homepageUrl` still points at `mise-task-manager.vercel.app`
  rather than its real canonical domain `https://mise.bolmso.app` — not yet fixed.
- When adding a new app to the platform, remember to add it to the table above (in every repo's
  copy of this file) and confirm its Vercel project has the `*.bolmso.app` domain the hub
  requires for auto-discovery.

## Repos carrying a copy of this file

Keep this file in sync (same content, or at least the same facts) across:

- [`NikRpk/betting-site`](https://github.com/NikRpk/betting-site) — `PROJECT_CONTEXT.md`
- [`NikRpk/mise-task-manager`](https://github.com/NikRpk/mise-task-manager) — `PROJECT_CONTEXT.md`

If you add a new app to the platform, add its repo to both this list and the app registry table,
and drop a copy of this file (or a link/reference to it) into the new repo too.
