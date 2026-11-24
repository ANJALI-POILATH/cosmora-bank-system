import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import config from './config.js';
import { HttpError } from './http.js';

const scrypt = promisify(scryptCb);

// Firebase mode: identities live in the bank's Firebase Authentication, the
// same users the X42 Worker accepts. Sign-in returns a Firebase ID token.
async function firebaseAuth() {
  const { getAuth } = await import('firebase-admin/auth');
  const auth = getAuth();
  const endpoint = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + config.firebase.webApiKey;
  return {
    async signIn(email, password) {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = body.error?.message || '';
        if (code.includes('TOO_MANY_ATTEMPTS')) throw new HttpError(429, 'Too many attempts. Try again later.');
        if (code.includes('USER_DISABLED')) throw new HttpError(403, 'This login has been disabled.');
        throw new HttpError(401, 'Incorrect email or password.');
      }
      return { token: body.idToken, uid: body.localId, email: body.email, expiresAt: Date.now() + Number(body.expiresIn) * 1000 };
    },
    async verify(token) {
      try {
        const claims = await auth.verifyIdToken(token);
        return { uid: claims.uid, email: claims.email };
      } catch { throw new HttpError(401, 'Your session has expired. Sign in again.'); }
    },
    async createUser({ email, password, displayName }) {
      try { return (await auth.createUser({ email, password, displayName })).uid; }
      catch (error) {
        if (error.code === 'auth/email-already-exists') throw new HttpError(409, 'An account with this email already exists.');
        if (error.code === 'auth/invalid-password') throw new HttpError(400, 'Use a password with at least 8 characters.');
        throw error;
      }
    },
    async findUser(email) {
      try { return (await auth.getUserByEmail(email)).uid; } catch { return null; }
    },
    async setDisabled(uid, disabled) { await auth.updateUser(uid, { disabled }); },
    async updateProfile(uid, { displayName }) { await auth.updateUser(uid, { displayName }); },
  };
}

// Local mode: scrypt password hashes in the JSON store and HMAC-signed tokens.
function localAuth(store) {
  const sign = payload => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return body + '.' + createHmac('sha256', config.tokenSecret).update(body).digest('base64url');
  };
  const hash = async (password, salt = randomBytes(16).toString('hex')) =>
    ({ salt, hash: (await scrypt(password, salt, 64)).toString('hex') });
  return {
    async signIn(email, password) {
      const [user] = await store.list('auth_users', ['email', email]);
      const check = user && await hash(password, user.salt);
      if (!user || !timingSafeEqual(Buffer.from(check.hash, 'hex'), Buffer.from(user.hash, 'hex'))) {
        throw new HttpError(401, 'Incorrect email or password.');
      }
      if (user.disabled) throw new HttpError(403, 'This login has been disabled.');
      const expiresAt = Date.now() + 8 * 3600_000;
      return { token: sign({ uid: user.id, email, exp: expiresAt }), uid: user.id, email, expiresAt };
    },
    async verify(token) {
      const [body, signature] = String(token).split('.');
      const expected = body && createHmac('sha256', config.tokenSecret).update(body).digest('base64url');
      if (!body || !signature || signature.length !== expected.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new HttpError(401, 'Sign in again.');
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (claims.exp < Date.now()) throw new HttpError(401, 'Your session has expired. Sign in again.');
      return { uid: claims.uid, email: claims.email };
    },
    async createUser({ email, password }) {
      if ((await store.list('auth_users', ['email', email])).length) throw new HttpError(409, 'An account with this email already exists.');
      const uid = randomUUID().replaceAll('-', '').slice(0, 28);
      await store.set('auth_users', uid, { email, ...(await hash(password)), disabled: false, createdAt: new Date() });
      return uid;
    },
    async findUser(email) { return (await store.list('auth_users', ['email', email]))[0]?.id || null; },
    async setDisabled(uid, disabled) { await store.update('auth_users', uid, { disabled }); },
    async updateProfile() {},
  };
}

export async function createAuth(store) {
  return config.mode === 'firebase' ? firebaseAuth() : localAuth(store);
}
