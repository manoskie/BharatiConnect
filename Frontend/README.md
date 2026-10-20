# BharatiConnect

BharatiConnect is a staff reading and engagement app built with TanStack Start,
React, TypeScript, and Firebase Authentication/Cloud Firestore.

## Run locally

1. Install Node.js and npm.
2. From the repository root, install dependencies with `npm install`.
3. Create `Frontend/.env.local` by copying `Frontend/.env.example`.
4. Fill in the Firebase web app values as described below.
5. Run `npm run dev` from the repository root.

`Frontend/.env.local` is ignored by Git. Do not commit it. Firebase web
configuration is visible to browser users, so Firestore security rules—not the
web config—must protect your data.

## Create and connect your Firebase project

Use a Google account that you or the organization controls:

1. Open [Firebase Console](https://console.firebase.google.com/) and create a
   project. Use an organization-owned account for a real deployment.
2. In **Project settings → General → Your apps**, add a **Web app** and copy its
   Firebase configuration values.
3. In **Authentication → Sign-in method**, enable **Email/Password**. Add
   `localhost` and your deployed website's domain under
   **Authentication → Settings → Authorized domains**.
4. In **Firestore Database**, create a database. For the default database, keep
   `VITE_FIREBASE_DATABASE_ID=(default)`; if you intentionally create a named
   database, use that exact database ID instead.
5. Copy the web app values into `Frontend/.env.local`:

   | Environment variable | Firebase web config field |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

   Keep the variable names from `.env.example`; replace the empty values with
   your values. Restart the dev server after editing this file.
   Google Books search works without an API key for low-volume use. To attach
   your own Google Books API key and reduce anonymous quota throttling, set
   `VITE_GOOGLE_BOOKS_API_KEY` in `Frontend/.env.local`. Restrict the key to
   the Google Books API and your website referrers in Google Cloud Console.
6. In **Firestore → Rules**, publish the rules from the repository's
   `firestore.rules` file. Do not use open/test rules for real data.
7. Bootstrap the first owner in the Firebase Console (Console writes bypass
   Firestore rules):
   - Under **Authentication → Users**, choose **Add user** and create your
     email/password account. Save the password securely.
   - Copy that user's **UID**. Under **Firestore → Data**, create
     `admins/{UID}` with a string field `role` set to `owner`.
   - In Firestore, create `users/{UID}` with these fields: `id` (the UID),
     `name`, `email`, `phone` (empty string), `role` (`owner`), `departmentId`
     (`d1`), `active` (true), `streak` (0), `points` (0), `level` (1),
     `language` (`mr`), `reminderTime` (`07:30`), `joinedAt` (`YYYY-MM-DD`),
     and `avatarColor` (`#6366f1`). Replace the sample values with your own
     name, email, and join date.
   - Create `departments/d1` with `id` (`d1`), `nameEn` (`General`), `nameMr`
     (`सामान्य`), and `staffCount` (0).
   - Sign in at `http://localhost:3000/admin` with the owner's email/password.
8. From the administrator portal, add staff or administrators. BharatiConnect
   creates each Firebase Authentication account with a temporary random
   password and emails a Firebase password-reset link so the invited person can
   choose their own password. Enable Firebase's password reset email template
   and verify the sender/domain settings before inviting real staff.

There is no public account-creation page. Only accounts created through the
administrator portal (or the initial Firebase Console bootstrap) have a
BharatiConnect profile. Use `/admin` for the administrator sign-in; staff pages
do not link to the administrator portal.

If sign-in reports `unauthorized-domain`, add the current website's domain to
Authentication's **Authorized domains**. If Firestore reports
`permission-denied`, confirm the rules were published and check that the signed
in account has matching `users/{uid}` and, for administrators,
`admins/{uid}` documents. Do not make the rules public to troubleshoot.

## Release 1 implementation notes

Email/password sign-in and password reset, admin roles, account invitations,
personal bookshelves, Google Books lookup, daily check-ins, and the reading
dashboard use Firebase. Reading logs are scoped by account and one log document
per staff member per calendar day in Asia/Kolkata. The check-in updates the
existing daily entry if the staff member submits again that day.

Administrators can manage the shared book catalogue from `/admin/books`. Search
Google Books or enter a title manually, verify the page count and language, and
choose whether it appears in Staff Picks. Staff Picks are shown under Content;
starting one adds it to the staff member's bookshelf. Publish the current
`firestore.rules` after deploying changes so catalogue and per-user activity
permissions are active.

The administrator pages are currently routes in the same web app, not a
separately deployed subdomain. Email/password login also does not provide
time-based two-factor authentication, and Firebase client code cannot meet the
PRD's trusted-server guarantees for lockouts, invitation enforcement,
streak-freeze scheduling, or scheduled reminders. Do not treat the prototype as
production-ready for sensitive staff data until those server-side controls and
the separate administrator deployment are implemented and reviewed.

Photo proof is not part of Release 1; keep `proofMode` set to `off`. Firebase
Authentication's password-reset email link is used to set invited users'
passwords.
