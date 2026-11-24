import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

const credentials = env.GOOGLE_APPLICATION_CREDENTIALS
  ? resolve(root, env.GOOGLE_APPLICATION_CREDENTIALS)
  : resolve(root, 'service-account.json');
if (existsSync(credentials)) env.GOOGLE_APPLICATION_CREDENTIALS = credentials;

// "firebase" uses the bank's real Firestore + Firebase Auth + the X42 Worker.
// "local" keeps everything in a JSON file and emulates the X42 API so the
// whole system can be run and tested without any Google credentials.
const mode = env.DATA_MODE || (existsSync(credentials) ? 'firebase' : 'local');
if (!['firebase', 'local'].includes(mode)) throw new Error('DATA_MODE must be "firebase" or "local".');
if (mode === 'firebase' && !existsSync(credentials)) {
  throw new Error('DATA_MODE=firebase needs a service-account key at ' + credentials + ' (see server/README.md).');
}

const config = {
  mode,
  port: Number(env.PORT || 4000),
  publicUrl: env.PUBLIC_URL || 'http://localhost:' + (env.PORT || 4000),
  allowedOrigins: (env.ALLOWED_ORIGINS || 'http://localhost:5173,https://anjali-poilath.github.io').split(',').map(s => s.trim()).filter(Boolean),
  portalUrl: env.PORTAL_URL || 'http://localhost:5173',
  bank: {
    id: env.BANK_ID || 'P625',
    name: env.BANK_NAME || 'Cosmora Bank',
    ifsc: env.BANK_IFSC || 'ANJA0H9L5PQ',
  },
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID || 'cosmora-bank-732ca',
    webApiKey: env.FIREBASE_WEB_API_KEY || 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  },
  x42WorkerUrl: env.X42_WORKER_URL || 'https://sharedbank-switch.e-commerce-sriramtpsiog.workers.dev',
  admin: {
    email: (env.ADMIN_EMAIL || 'admin@cosmora.bank').toLowerCase(),
    password: env.ADMIN_PASSWORD || (mode === 'local' ? 'CHANGE_ME' : ''),
    name: env.ADMIN_NAME || 'Cosmora Admin',
  },
  tokenSecret: env.TOKEN_SECRET || 'local-dev-secret-change-me',
  dataFile: resolve(root, env.DATA_FILE || 'data/local-db.json'),
  uploadDir: resolve(root, env.UPLOAD_DIR || 'uploads'),
  smtp: env.SMTP_HOST ? {
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  } : null,
  mailFrom: env.MAIL_FROM || 'Cosmora Bank <no-reply@cosmora.bank>',
  defaults: {
    openingMinor: 100_000, // INR 1,000 minimum opening balance
    perTransferMinor: 500_000, // same defaults the X42 Worker applies
    dailyMinor: 700_000,
  },
};

export default config;
