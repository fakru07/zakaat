# Zakaat Family Registry

This project is a static Firestore-powered survey app that can be hosted from GitHub Pages.

## What changed

- Rebuilt the app from scratch as a cleaner single-page registry.
- Removed the old plaintext-password login flow because it was not safe for GitHub hosting.
- Switched to modular Firebase SDK usage with a separate config file.
- Kept the core workflow: add families, manage members, filter by street, search, edit, delete, import CSV, and export CSV.

## Project files

- `index.html` - app structure
- `style.css` - responsive UI styling
- `app.js` - Firestore logic, UI rendering, CSV import/export
- `firebase-config.js` - active Firebase web config
- `firebase-config.example.js` - template for new deployments

## GitHub setup

1. Create a GitHub repository and push these files.
2. In GitHub, enable GitHub Pages for the repository.
3. Keep `firebase-config.js` with your Firebase web app credentials.
4. In Firestore, create a database and allow your frontend to read and write the `families` collection with proper security rules.

## Recommended Firestore document shape

Each document in `families` contains:

- `headName`
- `phone`
- `street`
- `address`
- `aadhar`
- `ration`
- `education`
- `abroad`
- `country`
- `zakatGive`
- `zakatReceive`
- `members`
- `createdAt`
- `updatedAt`

## Important note

If you need real login for a public GitHub-hosted app, the next safe step is Firebase Authentication. The old approach of saving passwords directly in Firestore should not be used.
