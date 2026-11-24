# Cosmora Bank server

Node + Express API for the Bank Management System: customer applications with
KYC documents, admin approve / hold / reject with Nodemailer emails, transfer
limits, bank management (common IFSC table), portfolio, loans and profile CRUD.
Balances live in the X42 ledger (`accounts`, `ledger_entries`,
`transfer_limits`), the same documents the SharedBank X42 Worker reads.

## Run

```bash
cd server
npm install
cp .env.example .env    # then edit
npm start               # http://localhost:4000
```

In another terminal, run the portal from the project root with `npm run dev`
(http://localhost:5173).

## Modes

| | `local` | `firebase` |
|---|---|---|
| Data | `server/data/local-db.json` | Firestore of `cosmora-bank-732ca` |
| Logins | scrypt hashes in the JSON file | Firebase Authentication |
| Balances & transfers | Built-in X42 emulator (same-bank only) | Live X42 Worker (interbank too) |
| Needs | Nothing | A service-account key |

The mode is picked automatically: `firebase` when `server/service-account.json`
exists, otherwise `local`. Force it with `DATA_MODE=local` or `DATA_MODE=firebase`.

### Switch to firebase mode

1. Firebase Console → **Project settings → Service accounts → Generate new private key**
   for `cosmora-bank-732ca`.
2. Save the downloaded file as `server/service-account.json`. It is git-ignored.
   Never commit or share it.
3. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in `server/.env`. The admin
   login is created in Firebase Authentication on the first start.
4. `npm start`. The portal now signs in with Firebase. Transfers go through
   the real X42 Worker, which only accepts the portal from
   `http://localhost:5173` and the GitHub Pages site.

The existing `user@test.com` customer (account `P625-001`) is linked automatically
the first time it signs in. New accounts continue from `P625-002`.

## Email

Without `SMTP_*` settings, every email is rendered and saved to the **outbox**
only. You can read them in Admin → Emails. To deliver real mail, for example
with Gmail, create an App Password and set:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=Cosmora Bank <you@gmail.com>
```

## Collections

`portal_users` (profiles, roles ADMIN/CUSTOMER, application status and history),
`loans`, `bank_directory` (common table), `outbox`, `counters`, plus the X42
collections `accounts`, `ledger_entries`, `transfer_limits` and `daily_usage`.
Uploaded KYC documents are stored in `server/uploads/<uid>/`.

## API summary

Public: `GET /api/config`, `POST /api/auth/sign-in`, `POST /api/applications` (multipart).
Signed in: `GET /api/me`, `PUT /api/applications/me`, `GET /api/banks`, `GET /api/documents/:uid/:id`,
`GET|PUT|DELETE /api/profile`, `GET /api/portfolio`, `POST|PATCH|DELETE /api/accounts[/:id]`,
`GET|POST /api/loans`, `POST /api/loans/:id/repay|cancel`.
Admin: `/api/admin/stats`, `/applications`, `/applications/:uid/decision`, `/customers`,
`/accounts/:id/limits`, `/accounts/:id/status`, `/banks`, `/banks/import`, `/loans`, `/loans/:id/decision`, `/outbox`.
