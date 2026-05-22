# Mise — Task & Note Manager

A production-ready internal tool for **task management and note-taking**, built with Next.js, Firebase, and deployed to Google Cloud Run.

Write meeting notes, capture decisions, and track tasks — all in one place, organised by project.

**Live:** https://hf-tasks.web.app · **Staging:** https://hf-tasks-staging.web.app

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
- **Daily Slack reminders** — Cloud Scheduler triggers at 08:00 Europe/Berlin and sends each user a personalised Slack message listing overdue, due-today, and due-tomorrow tasks
- **Customisable Slack templates** — per-project template with Handlebars syntax, editable in Project Settings
- **Feedback button** — in-app feedback goes directly to a Slack channel via Webhook

### Projects & Collaboration
- Create multiple projects; invite teammates by email
- **Role-based access control** — VIEW / EDIT / ADMIN roles enforced at the API and Firestore rules layer
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
| Framework | Next.js 14+ (App Router, SSR) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS variables |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firestore (`task-and-note-manager` database) |
| Storage | Firebase Storage (image attachments) |
| Hosting | Firebase Hosting → Cloud Run proxy |
| Backend | Google Cloud Run (Docker, `europe-west1`) |
| Build | Google Cloud Build (`cloudbuild.yaml`) |
| Cron | Google Cloud Scheduler |
| Functions | Firebase Cloud Functions (Slack deploy notifications) |
| CI/CD | GitHub Actions |
| Drag & Drop | @dnd-kit |
| Rich Text | TipTap |
| Icons | Lucide React |
| Date utils | date-fns + date-fns-tz |

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A Firebase project (Firestore + Auth + Hosting enabled)
- Google Cloud project with Cloud Run API enabled
- Google Workspace account for OAuth sign-in

### Local development

```bash
git clone https://github.com/NikRpk/hf-task-manager.git
cd hf-task-manager
npm install
cp .env.example .env.local   # fill in your Firebase config
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app connects to the production Firebase project by default. Set `NEXT_PUBLIC_DEV_MODE=true` in `.env.local` to skip authentication during development.

### Environment variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Your apps |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Console → Service Accounts |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Same service account JSON |
| `GOOGLE_CLIENT_ID` | GCP Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client |
| `GOOGLE_REDIRECT_URI` | Your app URL + `/api/auth/google/callback` |
| `SLACK_FEEDBACK_WEBHOOK_URL` | Slack Workflow Builder webhook |

Server-side secrets (`FIREBASE_ADMIN_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET`) are **never** in the codebase — they are stored in GCP Secret Manager and injected at deploy time via `cloudbuild.yaml --update-secrets`.

---

## Project Structure

```
├── app/
│   ├── api/               # API routes (all protected with Firebase Auth)
│   │   ├── tasks/         # CRUD for tasks
│   │   ├── notes/         # CRUD for notes
│   │   ├── projects/      # Project management
│   │   ├── settings/      # User + project settings
│   │   ├── calendar/      # Google Calendar OAuth + events
│   │   ├── people/        # Project member lookup
│   │   ├── slack/         # Slack template management
│   │   ├── cron/          # Daily reminder endpoint (called by Cloud Scheduler)
│   │   └── feedback/      # In-app feedback → Slack
│   ├── login/             # Google Sign-In page
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
├── functions/             # Firebase Cloud Functions (deploy Slack notifier)
├── hooks/                 # useTaskFilters, useCalendarEvents, usePermissions, …
├── lib/                   # Firebase clients, logger, API helpers, reminder logic, Slack client
├── types/                 # TypeScript interfaces
├── scripts/               # One-off admin/migration scripts (Node.js, not linted)
├── __tests__/             # Jest test suites
├── cloudbuild.yaml        # GCP Cloud Build pipeline
├── Dockerfile             # Multi-stage production image
├── firebase.json          # Hosting targets (production + staging)
└── firestore.rules        # Security rules
```

---

## Deployment

### Manual deploy (recommended for now)

Deploys to Cloud Run via Cloud Build, then updates Firebase Hosting:

```bash
npm run deploy
```

Requires `GCP_PROJECT_ID` set in your environment (or in `.env.local`). Uses `cloudbuild.yaml` — builds a Docker image, pushes to Artifact Registry, deploys to the `mise-tasks` Cloud Run service.

### GitHub Actions CI/CD

Every push to `main` automatically:
1. Runs the linter
2. Runs all tests with coverage
3. Builds the Next.js app (validates it compiles)
4. Deploys to **staging** (`https://hf-tasks-staging.web.app` → `mise-tasks-staging` Cloud Run)

To promote to **production**, go to **Actions → Test and Deploy → Run workflow → target: production**.

Secrets required in GitHub repository settings:

| Secret | Description |
|---|---|
| `GCP_SERVICE_ACCOUNT_KEY` | JSON key for `github-actions-deployer@dach-ai-mvps` SA |
| `GCP_PROJECT_ID` | `dach-ai-mvps` |
| `NEXT_PUBLIC_FIREBASE_*` | All six Firebase web config values |
| `NEXT_PUBLIC_APP_URL` | Production URL |

### Firebase Hosting targets

| Target | URL | Cloud Run service |
|---|---|---|
| `hf-tasks` (production) | https://hf-tasks.web.app | `mise-tasks` |
| `hf-tasks-staging` (staging) | https://hf-tasks-staging.web.app | `mise-tasks-staging` |

### Deploy Firestore rules / indexes only

```bash
npm run firebase:rules
npm run firebase:indexes
```

---

## Testing

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
npm run test:ci           # CI mode (used in GitHub Actions and pre-build)
```

Tests run automatically before every production build (`prebuild` script). Set `SKIP_PREBUILD=1` to bypass during local iteration.

**Current coverage:**
- Filtering logic (deadline, status, owner, priority, search) — 100%
- XSS sanitisation — 96%
- Debounce utility — 100%
- Firebase error helpers — 100%
- Permission / role checks — 100%

---

## Security

- Every API route is wrapped with `withAuth()` — unauthenticated requests return 401
- Firestore security rules enforce role-based access; the backend is a second layer, not the first
- Google Sign-In is restricted to `hellofresh.com` / `hellofresh.de` domains via Firebase Auth settings
- All server-side secrets live in GCP Secret Manager — never in git or environment files
- The `github-actions-deployer` service account has only the minimum IAM roles needed to submit builds and deploy Cloud Run

---

## Daily Reminders

Cloud Scheduler calls `POST /api/cron/daily-reminders` at **08:00 Europe/Berlin** every weekday. The endpoint:

1. Loads all tasks grouped by owner
2. Filters for overdue, due-today, and due-tomorrow items
3. Sends each user a Slack message via their configured webhook
4. Uses a per-project Handlebars template (editable in Project Settings → Slack)

To test locally: `npm run test:smoke`

---

## Documentation

- `FIREBASE_SETUP.md` — step-by-step Firebase project setup
- `DEPLOYMENT_GUIDE.md` — detailed deployment and local dev options
- `SECURITY.md` — why Cloud Run is public and how auth is enforced at the app layer
