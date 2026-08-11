# Mise — Task & Note Manager

A production-ready personal tool for **task management and note-taking**, built with Next.js, Supabase, and deployed on Vercel.

Write meeting notes, capture decisions, and track tasks — all in one place, organised by project.

---

## Features

### Notes
- **Rich-text editor** — TipTap-powered with bold, italic, headings, bullet lists, images, and smart auto-replacements (`->` → `→`, etc.)
- **Standalone notes** — write freeform notes, meeting minutes, decisions, or anything else; not tied to tasks
- **Note templates** — create reusable templates (e.g. "Weekly Sync", "Retrospective") and pick one when starting a new note; managed in Settings
- **Google Calendar linking** — attach a calendar event to a note so meeting minutes stay connected to the invite
- **Previous meeting pull-in** — a note can include a collapsible section showing the previous meeting's content for continuity
- **Notes list** — browse all notes in a project, searchable and sorted by last updated

### Tasks
- **Kanban board** — drag-and-drop columns with custom status options per project
- **Task detail modal** — title, description (rich text), deadline, priority, owner, sub-tasks, image attachments, comments, and status history
- **Recurring tasks** — set a recurrence interval and unit; completed instances automatically spawn the next occurrence
- **Quick-add page** (`/quick`) — minimal single-field form to create a task in seconds without opening the full board
- **Pagination** — "Done" column loads the 10 most recent completed tasks to keep the board fast; load more on demand
- **Owner normalisation** — owners are stored as emails (canonical ID); display names are resolved at render time

### Google Calendar Integration
- Connect your Google account via OAuth to pull in upcoming and past calendar events
- Browse events from a date-range window; load earlier events with "Load More"
- Attach events to notes directly from the note editor

### Notifications & Reminders
- **Daily Slack reminders** — Vercel Cron triggers at 06:00 UTC and sends each user a personalised Slack message listing overdue, due-today, and due-tomorrow tasks
- **Customisable Slack templates** — per-project template with Handlebars syntax, editable in Project Settings
- **Feedback button** — in-app feedback goes directly to a Slack channel via Webhook

### Projects & Collaboration
- Create multiple projects; invite teammates by email
- **Role-based access control** — VIEW / EDIT / ADMIN roles enforced at the API layer and backed by Postgres Row Level Security
- **Per-project settings** — custom status columns, priority levels, and topic labels
- **Member management** — add / remove members, change roles from Project Settings

### Settings
- **Profile** — display name
- **Appearance** — four colour schemes: Classic Green, Ocean Blue, Dark Mode, Minimal Grey
- **Notifications** — toggle email and desktop notifications per project
- **Note templates** — create, edit, delete reusable templates
- **Project settings** — per-project status, priority, topic, member, and Slack template configuration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router, SSR) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS variables |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase Postgres, with Row Level Security |
| Realtime | Supabase Realtime (Postgres change streams) |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |
| CI | GitHub Actions (lint + test + build check only — deploys happen via Vercel's Git integration) |
| Drag & Drop | @dnd-kit |
| Rich Text | TipTap |
| Icons | Lucide React |
| Date utils | date-fns + date-fns-tz |

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (Postgres + Auth enabled)
- A [Vercel](https://vercel.com) account, for hosting
- (Optional) A Google Cloud project with OAuth credentials, for Google Sign-In and Calendar integration
- (Optional) A Slack app/bot token, for reminders and feedback

### 1. Set up Supabase

1. Create a new Supabase project.
2. Open the SQL editor and run the contents of [`db/schema.sql`](db/schema.sql) — this creates all tables, enums, triggers, and Row Level Security policies.
3. In **Authentication → Providers**, enable **Email** and (optionally) **Google**. For Google, you'll need a Google OAuth client ID/secret (see below) and to set the redirect URL to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. In **Authentication → URL Configuration**, add your app URL (e.g. `http://localhost:3000` for local dev, your Vercel domain for production) to the redirect allow-list.
5. Copy your **Project URL**, **anon public key**, and **service_role key** from **Project Settings → API**.

### 2. Local development

```bash
git clone https://github.com/NikRpk/mise-task-manager.git
cd mise-task-manager
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up with email/password (or Google, if configured), and start creating projects.

### Environment variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**secret** — server-side only) |
| `SUPABASE_PROJECT_ID` | Your Supabase project ref (used by `npm run supabase:types`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GCP Console → APIs & Services → Credentials |
| `GOOGLE_REDIRECT_URI` | Your app URL + `/api/auth/google/callback` (Calendar integration only — separate from Supabase's OAuth redirect) |
| `SLACK_BOT_TOKEN` | Slack app → OAuth & Permissions |
| `SLACK_FEEDBACK_WEBHOOK_URL` | Slack Workflow Builder webhook |
| `CRON_SECRET` | Any long random string — set the same value in Vercel |

See [`.env.example`](.env.example) for the full list with placeholder values.

---

## Project Structure

```
├── app/
│   ├── api/               # API routes (all protected with Supabase Auth via withAuth())
│   │   ├── tasks/         # CRUD for tasks
│   │   ├── notes/         # CRUD for notes
│   │   ├── projects/      # Project management
│   │   ├── settings/      # User + project settings
│   │   ├── calendar/      # Google Calendar OAuth + events
│   │   ├── people/        # Project member lookup
│   │   ├── slack/         # Slack template management
│   │   ├── cron/          # Daily reminder endpoint (called by Vercel Cron)
│   │   └── feedback/      # In-app feedback → Slack
│   ├── auth/callback/     # Supabase OAuth redirect handler
│   ├── login/             # Google Sign-In + email/password login page
│   ├── notes/             # Notes list, new note, note detail
│   ├── quick/             # Quick task creation
│   ├── settings/          # Settings page (profile, appearance, projects)
│   └── page.tsx           # Main Kanban board
├── components/
│   ├── ui/                # Shared primitives (Button, Input, DatePicker, Select, Toggle, ColorPicker, FilterPills)
│   ├── TaskModal/         # Task detail + edit modal
│   ├── KanbanColumn.tsx   # Drag-and-drop column
│   ├── TipTapEditor.tsx   # Rich text editor
│   └── ...
├── hooks/                 # useTaskFilters, useCalendarEvents, usePermissions, …
├── lib/
│   ├── supabase/          # client.ts (browser), server.ts (SSR/OAuth), admin.ts (service-role)
│   ├── auth-middleware.ts # withAuth() — verifies Supabase JWTs, checks project roles
│   ├── db-mappers.ts      # snake_case Postgres rows ↔ camelCase TS types
│   ├── realtime-listeners.ts # Supabase Realtime subscriptions
│   └── ...                # logger, API helpers, reminder logic, Slack client
├── types/                 # TypeScript interfaces
├── db/
│   └── schema.sql         # Postgres schema + RLS policies (run once in Supabase SQL editor)
├── scripts/                # Smoke tests
├── __tests__/              # Jest test suites
└── vercel.json             # Vercel Cron configuration
```

---

## Deployment

Deployment is handled entirely by **Vercel's Git integration** — no manual deploy scripts or CI deploy jobs.

### First-time setup

1. Push this repo to your own GitHub account (or fork it).
2. In the [Vercel dashboard](https://vercel.com/new), import the repository.
3. Add all environment variables from `.env.example` (with real values) under **Project Settings → Environment Variables**. Add them for both **Production** and **Preview** environments.
4. Deploy. Vercel automatically detects Next.js and builds/deploys on every push.
5. In Supabase, add your production Vercel URL to **Authentication → URL Configuration → Redirect URLs** (and update `NEXT_PUBLIC_APP_URL` / `GOOGLE_REDIRECT_URI` accordingly).

### Ongoing deploys

- Every push to `main` → production deploy.
- Every pull request → an isolated preview deploy with its own URL (posted as a PR comment by Vercel's GitHub app).

### GitHub Actions (CI only)

`.github/workflows/test-and-deploy.yml` runs on every push/PR:
1. Lint
2. Tests with coverage
3. A production build (`next build`), to catch build-time errors before Vercel does

It does **not** deploy anything — that's Vercel's job.

### Vercel Cron

`vercel.json` schedules `GET /api/cron/daily-reminders` at `0 6 * * *` (06:00 UTC daily). Vercel automatically sends `Authorization: Bearer $CRON_SECRET`, which the route verifies. Adjust the schedule or timezone handling directly in the route (it currently reasons in `Europe/Berlin` internally — see `lib/reminders.ts`).

---

## Testing

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
npm run test:ci           # CI mode (used in GitHub Actions and pre-build)
npm run test:smoke        # black-box HTTP smoke tests against a running instance
```

Tests run automatically before every production build (`prebuild` script). Set `SKIP_PREBUILD=1` to bypass during local iteration.

To smoke-test a live deployment:

```bash
BASE_URL=https://your-app.vercel.app npm run test:smoke
```

---

## Security

- Every API route is wrapped with `withAuth()` — unauthenticated requests return 401
- Postgres Row Level Security policies (`db/schema.sql`) enforce role-based access as a second layer, independent of the API
- Sign-in supports Google OAuth and email/password; there is no email-domain restriction — this is a personal deployment anyone can sign up to
- All server-side secrets live in Vercel Environment Variables — never in git
- See [`SECURITY.md`](SECURITY.md) for the full architecture and threat model

---

## Daily Reminders

Vercel Cron calls `GET /api/cron/daily-reminders` at **06:00 UTC** every day. The endpoint:

1. Loads all tasks grouped by owner
2. Filters for overdue, due-today, and due-tomorrow items
3. Sends each user a Slack message via their configured webhook
4. Uses a per-project Handlebars template (editable in Project Settings → Slack)

To test locally: `npm run test:smoke`, or trigger `POST /api/cron/daily-reminders` directly with `Authorization: Bearer $CRON_SECRET`.

---

## Migrating from the previous Firebase/GCP deployment

This project was migrated from Firestore + Firebase Auth + Cloud Run to Supabase + Vercel. There is no automatic data migration path — this is a fresh instance with an empty database. If you have data in an old Firestore instance you want to preserve, you'll need to export it and write a one-off script to insert it into the corresponding Postgres tables (see `db/schema.sql` for the target schema).

## Documentation

- [`SECURITY.md`](SECURITY.md) — authentication/authorization model and architecture
- [`db/schema.sql`](db/schema.sql) — full Postgres schema, run once in the Supabase SQL editor
