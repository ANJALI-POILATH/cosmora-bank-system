import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import multer from 'multer';
import config from './config.js';
import { HttpError, paiseFromRupees, text } from './http.js';

export const statuses = ['PENDING', 'ON_HOLD', 'APPROVED', 'REJECTED', 'CLOSED'];

// Checks the token on every protected request and loads the caller's profile.
export function authenticate({ auth, store, ledger }) {
  return async (req, res, next) => {
    try {
      const header = req.get('authorization') || '';
      if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Sign in to continue.');
      req.user = await auth.verify(header.slice(7));
      req.profile = await resolveProfile({ store, ledger }, req.user);
      next();
    } catch (error) { next(error); }
  };
}

export const requireAdmin = (req, res, next) =>
  next(req.profile?.role === 'ADMIN' ? undefined : new HttpError(403, 'Administrator access is required.'));

export const requireCustomer = (req, res, next) =>
  next(req.profile?.role === 'CUSTOMER' && req.profile.status === 'APPROVED'
    ? undefined : new HttpError(403, 'This needs an approved customer account.'));

// Customers created before this portal (for example the bank.sh test user)
// have X42 accounts but no profile yet: adopt them as approved customers.
export async function resolveProfile({ store, ledger }, { uid, email }) {
  const profile = await store.get('portal_users', uid);
  if (profile) return profile;
  const accounts = await ledger.accountsOf(uid);
  if (!accounts.length) return { uid, email, role: 'CUSTOMER', status: 'NONE' };
  const now = new Date().toISOString();
  const adopted = {
    uid, email, role: 'CUSTOMER', status: 'APPROVED', fullName: email.split('@')[0], legacy: true,
    accountId: accounts[0].id, accountNumber: accounts[0].accountNumber, documents: [],
    history: [{ status: 'APPROVED', note: 'Existing X42 customer linked to the portal', at: now, by: 'system' }],
    createdAt: now, updatedAt: now,
  };
  await store.set('portal_users', uid, adopted);
  return adopted;
}

export const publicProfile = profile => {
  const { history = [], documents = [], ...rest } = profile;
  return { ...rest, history, documents };
};

// ---------- Application form parsing & validation ----------

const allowedTypes = { 'application/pdf': ['.pdf', '%PDF'], 'image/png': ['.png', '\x89PNG'], 'image/jpeg': ['.jpg', '\xff\xd8\xff'] };
export const documentFields = [
  { name: 'idProof', type: 'ID_PROOF', label: 'Identity proof' },
  { name: 'addressProof', type: 'ADDRESS_PROOF', label: 'Address proof' },
  { name: 'photo', type: 'PHOTO', label: 'Photograph' },
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 30 },
  fileFilter: (req, file, done) => done(allowedTypes[file.mimetype] ? null : new HttpError(400, 'Upload PDF, PNG or JPG files only.'), true),
}).fields(documentFields.map(({ name }) => ({ name, maxCount: 1 })));

export async function saveDocuments(uid, files = {}) {
  const saved = [];
  for (const field of documentFields) {
    const file = files[field.name]?.[0];
    if (!file) continue;
    const [ext, magic] = allowedTypes[file.mimetype];
    if (file.buffer.subarray(0, magic.length).toString('latin1') !== magic) {
      throw new HttpError(400, field.label + ' does not look like a valid ' + ext.slice(1).toUpperCase() + ' file.');
    }
    const id = randomUUID();
    const dir = join(config.uploadDir, uid);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, id + ext), file.buffer);
    saved.push({ id, type: field.type, label: field.label, file: id + ext, name: file.originalname.replace(/[^\w. -]/g, '_').slice(0, 100),
      contentType: file.mimetype, size: file.size, uploadedAt: new Date().toISOString() });
  }
  return saved;
}

const age = dob => {
  const birth = new Date(dob + 'T00:00:00Z');
  if (Number.isNaN(birth.getTime())) return -1;
  const now = new Date();
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) years--;
  return years;
};

// Validates the editable personal details shared by registration and updates.
export function personalDetails(body, { partial = false } = {}) {
  const required = !partial;
  const details = {
    phone: text(body.phone, { field: 'Mobile number', pattern: /^[6-9]\d{9}$/, message: 'Enter a 10-digit Indian mobile number.', required }),
    occupation: text(body.occupation, { field: 'Occupation', max: 80, required }),
    addressLine: text(body.addressLine, { field: 'Address', max: 200, required }),
    city: text(body.city, { field: 'City', max: 60, required }),
    state: text(body.state, { field: 'State', max: 60, required }),
    pincode: text(body.pincode, { field: 'PIN code', pattern: /^\d{6}$/, message: 'Enter a 6-digit PIN code.', required }),
  };
  return Object.fromEntries(Object.entries(details).filter(([, v]) => v !== ''));
}

export function applicationDetails(body) {
  const fullName = text(body.fullName, { field: 'Full name', max: 100, pattern: /^[\p{L} .'-]{2,}$/u, message: 'Enter your full name.' });
  const email = text(body.email, { field: 'Email', max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' }).toLowerCase();
  const dob = text(body.dob, { field: 'Date of birth', pattern: /^\d{4}-\d{2}-\d{2}$/ });
  const years = age(dob);
  if (years < 18 || years > 120) throw new HttpError(400, 'Applicants must be at least 18 years old.');
  const gender = text(body.gender, { field: 'Gender', max: 20, required: false });
  const pan = text(body.pan, { field: 'PAN', pattern: /^[A-Z]{5}\d{4}[A-Z]$/, message: 'Enter a valid PAN, for example ABCDE1234F.' }).toUpperCase();
  const aadhaar = text(body.aadhaar, { field: 'Aadhaar number', pattern: /^\d{12}$/, message: 'Enter the 12-digit Aadhaar number.' });
  const initialDepositMinor = paiseFromRupees(body.initialDeposit);
  if (initialDepositMinor === null || initialDepositMinor < config.defaults.openingMinor || initialDepositMinor > 100_000_00) {
    throw new HttpError(400, 'The initial balance must be between ₹1,000 and ₹1,00,000.');
  }
  return { fullName, email, dob, gender, pan, aadhaarMasked: 'XXXX XXXX ' + aadhaar.slice(-4), initialDepositMinor, ...personalDetails(body) };
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, 'Use a password with at least 8 characters, including a letter and a number.');
  }
  return value;
}
