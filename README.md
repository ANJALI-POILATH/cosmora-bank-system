# Bank portal template

Register the bank with the SharedBank operator. Set its bank ID, name, IFSC and branding in `src/bank-config.js`. Set the common HTTPS Worker URL in `src/cloudflare-config.js`, or set the repository variable `VITE_X42_API_URL`.

On Node.js 22 or newer, run `npm ci` and `npm run dev` to work locally. The portal uses the bank's Firebase test account and displays live synthetic balances from the Worker.

Publish this folder to a GitHub repository and enable its GitHub Pages source with **GitHub Actions**. The supplied workflow deploys the `main` branch.

## Firestore in the browser

`src/firebase.js` initialises the Firebase Web SDK (`app`, `auth`, `db`) for `cosmora-bank-732ca`.
`src/user-profile.js` signs in with Firebase Authentication and reads or saves the user's own
`users/{uid}` document. To include the web app ID, set `VITE_FIREBASE_APP_ID` in `.env.local`.

`firestore.rules` lets a signed-in user read and write only `users/{their uid}` and denies all
other browser access. The server and the X42 Worker use service accounts, so the rules do not
affect them. Deploy the rules with:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```
