# BharatiConnect

BharatiConnect is a bilingual reading-habit and staff engagement web application built for **Akshar Bharati NGO**. Staff and volunteers can record daily reading, save personal reflections, track consecutive reading streaks, and participate in a points leaderboard. Administrators manage staff, departments, holidays, and portal access.

This repository is a **Service Learning project for Akshar Bharati NGO**.

## Key Features

- **Daily reading check-ins:** Record pages read against an active book and add a personal “What stayed with you today?” reflection. Reading history and takeaways are scoped to the signed-in user.
- **Bookshelf and completion:** Maintain a reading list, track current-page progress, and mark books as completed.
- **Streaks and gamification:** Consecutive-day streaks are calculated from dated reading logs. Check-ins update points and the user’s saved streak in Firestore. The home screen displays points, level, and a live points leaderboard.
- **Reading history calendar:** Review logged days, missed days after the account-start cutoff, and holidays. Past dates are informational; the calendar does not allow retroactive check-ins.
- **Role-based administration:** The application distinguishes `staff`, `admin`, and `owner` roles. Admins can manage staff accounts and departments; owner-only controls include creating administrator accounts and managing administrator access. Admin routes are protected and unauthorized users are redirected.
- **Holiday management:** Administrators can create organization-wide holidays that appear on staff calendars.
- **English and Marathi localization:** The interface supports English and Marathi.

## Tech Stack

- React and TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication and Cloud Firestore
- Lucide React icons
- TanStack Router and TanStack Query

## Repository Layout

```text
.
├── Frontend/
│   ├── src/
│   │   ├── components/    # Shared and role-specific UI
│   │   ├── lib/           # Firebase services, app state, translations
│   │   └── routes/        # File-based application routes
│   ├── .env.example       # Frontend environment-variable template
│   └── package.json
├── firestore.rules        # Firestore authorization rules
├── firestore.indexes.json # Firestore composite indexes
└── firebase.json          # Firebase CLI configuration
```

## Getting Started

### Prerequisites

- Node.js 20 or newer and npm
- A Firebase project with **Email/Password** Authentication enabled and Cloud Firestore initialized
- Firebase CLI for deploying Firestore rules and indexes

### 1. Clone and install

```bash
git clone https://github.com/manoskie/BharatiConnect.git
cd BharatiConnect
npm install
```

Dependencies are managed from the repository root using the `Frontend` npm workspace.

### 2. Configure Firebase

Create a local frontend environment file from the template:

```bash
cp Frontend/.env.example Frontend/.env.local
```

On PowerShell, use:

```powershell
Copy-Item Frontend/.env.example Frontend/.env.local
```

Fill in the Firebase **web app** configuration values in `Frontend/.env.local`:

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket setting |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_DATABASE_ID` | Firestore database ID; defaults to `(default)` |
| `VITE_GOOGLE_BOOKS_API_KEY` | Optional key for Google Books search |

Values prefixed with `VITE_` are included in client-side code; they are **not server secrets**. Do not put service-account keys, private keys, or privileged credentials in frontend environment variables. Keep `.env.local` out of version control.

For Firebase Authentication, enable the sign-in providers used by the application. Provision the initial owner using a trusted administrative process: the owner needs an active `users/{uid}` profile and an `admins/{uid}` document with `role: "owner"`.

### 3. Deploy Firestore rules and indexes

Authenticate with the Firebase CLI and select the intended project:

```bash
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

The CLI uses `firebase.json` to deploy `firestore.rules` and `firestore.indexes.json`. Review both before deploying to a production project.

### 4. Run the application

```bash
npm run dev
```

Vite serves the frontend at `http://localhost:3000`.

### Other useful commands

```bash
npm run lint
npm run build
npm run preview
```

## Architecture and Security

The application’s primary authentication and data path uses the Firebase client SDK. Firestore snapshots provide live updates to user, reading-log, holiday, and leaderboard views. Authorization is enforced by **Firestore Security Rules**, which distinguish regular users from administrators and owners and restrict protected writes to the appropriate role and fields.

There is no dedicated Node.js application server required for the core Firebase-backed workflows. The frontend also contains an optional REST API adapter (configured with `VITE_API_BASE_URL`, defaulting to `/api`) for legacy endpoints and fallback data; deploy or configure a compatible API if using those endpoints.

Security rules are the authorization boundary—UI role checks alone are not sufficient. Deploy the rules before enabling production access, use least-privilege account provisioning, and never rely on client-side validation to protect privileged data.

## License

No license is currently specified in this repository. Contact the project maintainers before redistributing or reusing the software.
