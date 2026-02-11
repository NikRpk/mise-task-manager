# HelloFresh Task Manager

An internal task management system for HelloFresh, built with Next.js, Firebase, and Tailwind CSS.

## Features

- 🔐 **Google Authentication** - Sign in with your HelloFresh Google account
- 📋 **Project Management** - Create and manage multiple projects
- ✅ **Task Tracking** - Kanban-style task boards with drag-and-drop
- 👥 **Team Collaboration** - Share projects with role-based permissions (VIEW/EDIT/ADMIN)
- ⚙️ **Project-Specific Settings** - Custom status options, priorities, and fields per project
- 🎨 **Multiple Color Schemes** - Choose from HelloFresh Green, Ocean Blue, Dark Mode, or Minimal Grey
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Language**: TypeScript
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project set up (see `FIREBASE_SETUP.md`)
- HelloFresh Google Workspace account

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hf-task-manager
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase configuration from the Firebase Console.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
hf-task-manager/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (with Firebase Admin SDK)
│   ├── login/             # Login page
│   ├── settings/          # User settings page
│   ├── projects/[id]/     # Project-specific pages
│   └── page.tsx           # Main task board
├── components/            # React components
├── lib/                   # Utility functions and Firebase config
├── types/                 # TypeScript type definitions
├── public/                # Static assets
├── firestore.rules        # Firebase security rules
├── firestore.indexes.json # Firestore indexes
└── firebase.json          # Firebase configuration
```

## Key Concepts

### Authentication

The app uses Firebase Authentication with Google Sign-In. Only users with HelloFresh Google accounts can access the system (enforced via IAM).

### Projects

- Each user can create multiple projects
- Projects have members with different roles:
  - **VIEW**: Read-only access
  - **EDIT**: Can create and modify tasks
  - **ADMIN**: Full control (tasks, settings, member management)

### Project Settings

Each project has its own configuration:
- Status options (columns in Kanban board)
- Priority levels
- Custom fields

### User Settings

Global user preferences:
- Display name
- Color scheme
- Notification preferences

## Deployment

### Quick Deploy (2-3 minutes)

```bash
npm run deploy
```

### Deploy to Custom Domain (hf-tasks.web.app)

```bash
npm run deploy:custom-domain
```

For detailed deployment options and troubleshooting, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Development Workflow

### Local Development (Instant!)

```bash
# Standard local development (uses production Firebase)
npm run dev

# Local development with emulators (isolated testing)
npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000)

**All API routes work locally!** ✅

### Deployment

```bash
# Fast deployment (2-3 minutes) - RECOMMENDED!
npm run deploy

# Standard deployment (5-8 minutes)
npm run deploy:standard

# Deploy to custom domain (hf-tasks.web.app)
npm run deploy:custom-domain
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# CI test run (what runs in deployment)
npm run test:ci
```

**Test Coverage:**
- ✅ 94 tests protecting critical functionality
- ✅ 100% coverage on date filtering logic
- ✅ 100% coverage on debounce utility
- ✅ 96% coverage on XSS prevention
- ✅ Tests run automatically before deployment

See `TESTING_GUIDE.md` for detailed testing documentation.

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

**Note:** Tests and linting run automatically before build (`prebuild` script).

### Deploy Firestore Rules

```bash
npm run firebase:rules
```

### Deploy Firestore Indexes

```bash
npm run firebase:indexes
```

## Security

- All API routes are protected with Firebase authentication
- Firestore security rules enforce role-based access control
- Service account keys are never committed to git
- Environment variables are kept in `.env.local` (gitignored)

## Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Fast deployment & local development
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Step-by-step Firebase project setup
- [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md) - Design system and UI guidelines

## Contributing

This is an internal HelloFresh tool. For feature requests or bug reports, contact the development team.

## License

Internal use only - HelloFresh GmbH

---

Built with ❤️ for HelloFresh
