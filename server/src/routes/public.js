import { Router } from 'express';
import config from '../config.js';
import { HttpError, route, text } from '../http.js';
import {
  applicationDetails, authenticate, password, personalDetails, publicProfile, resolveProfile, saveDocuments, upload,
} from '../profiles.js';

// Very small in-memory throttle for password endpoints (per IP, per endpoint).
const attempts = new Map();
const perMinute = Number(process.env.THROTTLE_PER_MIN || 15);
function throttle(req, bucket) {
  const key = bucket + ':' + req.ip;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(t => now - t < 60_000);
  if (recent.length >= perMinute) throw new HttpError(429, 'Too many attempts. Wait a minute and try again.');
  recent.push(now);
  attempts.set(key, recent);
}

export function publicRoutes(ctx) {
  const { store, auth, mail } = ctx;
  const router = Router();

  router.get('/config', (req, res) => {
    res.json({
      mode: config.mode,
      bank: config.bank,
      // Where the portal sends X42 calls (dashboard, transfers, directory).
      x42Base: config.mode === 'firebase' ? config.x42WorkerUrl : config.publicUrl,
      defaults: config.defaults,
    });
  });

  router.post('/auth/sign-in', route(async (req, res) => {
    throttle(req, 'sign-in');
    const email = text(req.body?.email, { field: 'Email', max: 120 }).toLowerCase();
    const session = await auth.signIn(email, String(req.body?.password || ''));
    const profile = await resolveProfile(ctx, session);
    res.json({ ...session, role: profile.role, status: profile.status, profile: publicProfile(profile) });
  }));

  router.get('/me', authenticate(ctx), (req, res) => res.json(publicProfile(req.profile)));

  // Customer self-registration: personal details, KYC documents and the
  // opening balance. The login is created now so the applicant can follow
  // the review; the X42 account is only opened when an admin approves.
  router.post('/applications', upload, route(async (req, res) => {
    throttle(req, 'register');
    const details = applicationDetails(req.body || {});
    const secret = password(req.body?.password);
    if (!req.files?.idProof || !req.files?.addressProof) throw new HttpError(400, 'Upload both an identity proof and an address proof.');
    if (req.body?.acceptTerms !== 'true') throw new HttpError(400, 'Accept the terms to continue.');

    const uid = await auth.createUser({ email: details.email, password: secret, displayName: details.fullName });
    try {
      const documents = await saveDocuments(uid, req.files);
      const now = new Date().toISOString();
      await store.set('portal_users', uid, {
        uid, role: 'CUSTOMER', status: 'PENDING', ...details, documents,
        history: [{ status: 'PENDING', note: 'Application submitted', at: now, by: 'customer' }],
        createdAt: now, updatedAt: now,
      });
    } catch (error) {
      await auth.setDisabled(uid, true).catch(() => {});
      throw error;
    }
    await mail(details.email, 'received', { name: details.fullName });
    res.status(201).json({ uid, status: 'PENDING' });
  }));

  // Applicants on hold (or still pending) can correct details, add documents and resubmit.
  router.put('/applications/me', authenticate(ctx), upload, route(async (req, res) => {
    const profile = req.profile;
    if (profile.role !== 'CUSTOMER' || !['PENDING', 'ON_HOLD'].includes(profile.status)) {
      throw new HttpError(409, 'Only pending or on-hold applications can be updated.');
    }
    const updates = personalDetails(req.body || {}, { partial: true });
    const added = await saveDocuments(profile.uid, req.files);
    const replaced = new Set(added.map(d => d.type));
    const documents = [...profile.documents.filter(d => !replaced.has(d.type)), ...added];
    const now = new Date().toISOString();
    const note = text(req.body?.note, { field: 'Message', max: 500, required: false });
    await store.update('portal_users', profile.uid, {
      ...updates, documents, status: 'PENDING', updatedAt: now,
      history: [...profile.history, { status: 'PENDING', note: note ? 'Resubmitted: ' + note : 'Application resubmitted', at: now, by: 'customer' }],
    });
    res.json(publicProfile(await store.get('portal_users', profile.uid)));
  }));

  // Common table: bank directory with IFSC and address details.
  router.get('/banks', authenticate(ctx), route(async (req, res) => {
    const banks = await store.list('bank_directory');
    res.json({ banks: banks.sort((a, b) => Number(b.isOwn || 0) - Number(a.isOwn || 0) || a.bankName.localeCompare(b.bankName)) });
  }));

  return router;
}
