# Sanjay Photo Studio & Films — Book Our Order

Independent customer booking website and owner dashboard.

## Files
- `index.html` — customer booking page
- `booking.html` — compatibility redirect to `index.html`
- `owner.html` — owner dashboard
- `css/` — page styles
- `js/` — Firebase, booking and owner logic
- `firestore.rules` — Firestore access rules

## Before going live
1. Create a Firebase project and register a Web App.
2. Copy the Firebase Web App config into `js/firebase.js`.
3. Enable Google Authentication and Firestore.
4. Deploy `firestore.rules`.
5. Create an owner document in Firestore at `owners/{OWNER_UID}` with `{ "active": true }` using a trusted Firebase console/admin process. Never allow public client-side creation of owner records.
6. Add the exact GitHub Pages domain to Firebase Authentication authorized domains.
7. Test a customer booking and owner access before sharing the website.

## Important
Firebase Web App config is intended for client apps, but Firestore Security Rules are the actual access control. Never publish service-account JSON, private keys, passwords, or privileged credentials.

New bookings are requests; prices remain unquoted until the studio confirms them. Advance and remaining payment details are owner-side only.
