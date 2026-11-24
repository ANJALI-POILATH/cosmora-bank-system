import express from 'express';
import cors from 'cors';
import multer from 'multer';
import config from './config.js';
import { createStore } from './store.js';
import { createAuth } from './auth.js';
import { createMailer } from './mailer.js';
import { createLedger } from './ledger.js';
import { localX42 } from './x42-local.js';
import { publicRoutes } from './routes/public.js';
import { customerRoutes } from './routes/customer.js';
import { adminRoutes } from './routes/admin.js';

const store = await createStore();
const auth = await createAuth(store);
const ledger = createLedger(store);
const mail = createMailer(store);
const ctx = { store, auth, ledger, mail };

// "Admin account is pre-created with one user": make sure it exists.
async function seedAdmin() {
  let uid = await auth.findUser(config.admin.email);
  if (!uid) {
    if (!config.admin.password) {
      console.warn(`! Admin ${config.admin.email} does not exist. Set ADMIN_PASSWORD in server/.env to create it.`);
      return;
    }
    uid = await auth.createUser({ email: config.admin.email, password: config.admin.password, displayName: config.admin.name });
    console.log('Created the administrator login ' + config.admin.email);
  }
  const existing = await store.get('portal_users', uid);
  if (existing?.role !== 'ADMIN') {
    const now = new Date().toISOString();
    await store.set('portal_users', uid, { uid, email: config.admin.email, fullName: config.admin.name, role: 'ADMIN', status: 'APPROVED',
      documents: [], history: [], createdAt: now, updatedAt: now });
  }
}

// The common bank table always contains this bank.
async function seedBank() {
  if (await store.get('bank_directory', config.bank.ifsc)) return;
  const now = new Date().toISOString();
  await store.set('bank_directory', config.bank.ifsc, { bankName: config.bank.name, ifsc: config.bank.ifsc, bankId: config.bank.id,
    branch: 'Main branch', address: '', city: '', state: '', pincode: '', phone: '', email: '', portalUrl: 'https://anjali-poilath.github.io/cosmora-bank/',
    isOwn: true, source: 'SYSTEM', networkStatus: 'ACTIVE', createdAt: now, updatedAt: now });
}

await seedAdmin();
await seedBank();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
// Lets the GitHub Pages site (a public HTTPS origin) call this server on localhost:
// browsers send a Private Network Access preflight that must be answered.
app.use((req, res, next) => {
  if (req.get('access-control-request-private-network') && config.allowedOrigins.includes(req.get('origin'))) {
    res.set('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
app.use(cors({ origin: config.allowedOrigins, allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'] }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', publicRoutes(ctx));
app.use('/api', customerRoutes(ctx));
app.use('/api/admin', adminRoutes(ctx));
if (config.mode === 'local') app.use('/api/v1', localX42(store, auth));
app.get('/', (req, res) => res.json({ service: 'cosmora-bank-server', mode: config.mode }));

app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }));
// Errors use the same shape as the X42 Worker: { error: { code, message } }.
app.use((error, req, res, next) => {
  let status = error.status || 500;
  let message = error.message;
  if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Each document must be 5 MB or smaller.' : 'The upload could not be processed.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400; message = 'The request body is not valid JSON.';
  }
  if (status >= 500) {
    console.error(error);
    message = 'Something went wrong on the server.';
  }
  res.status(status).json({ error: { code: error.code || 'ERROR', message } });
});

app.listen(config.port, () => {
  console.log(`Cosmora Bank server (${config.mode} mode) on ${config.publicUrl}`);
  if (config.mode === 'local') console.log(`Admin login: ${config.admin.email} / ${config.admin.password}`);
});
