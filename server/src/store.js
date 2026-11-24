import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import config from './config.js';

// One small document-store interface with two backends:
//   get(col, id) · set(col, id, data) · update(col, id, patch) · remove(col, id)
//   list(col, [field, value]?) · runTransaction(async tx => ...) where tx has get/set/update
// Dates are stored as Firestore timestamps (firebase) or ISO strings (local) and
// always come back as ISO strings.

const clone = value => structuredClone(value);
const plain = value => JSON.parse(JSON.stringify(value)); // Date -> ISO string

function localStore() {
  const file = config.dataFile;
  mkdirSync(dirname(file), { recursive: true });
  const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  let saving = Promise.resolve();
  let queue = Promise.resolve();
  const persist = () => {
    saving = saving.then(async () => {
      const temp = file + '.tmp';
      await writeFile(temp, JSON.stringify(data, null, 2));
      await rename(temp, file);
    }).catch(error => console.error('Could not save local database:', error.message));
    return saving;
  };
  const col = name => (data[name] ||= {});
  const ops = {
    get: async (c, id) => (col(c)[id] ? { id, ...clone(col(c)[id]) } : null),
    set: async (c, id, value) => { col(c)[id] = plain(value); },
    update: async (c, id, patch) => {
      if (!col(c)[id]) throw Object.assign(new Error('Not found: ' + c + '/' + id), { status: 404 });
      Object.assign(col(c)[id], plain(patch));
    },
  };
  return {
    kind: 'local',
    get: ops.get,
    async set(c, id, value) { await ops.set(c, id, value); await persist(); },
    async update(c, id, patch) { await ops.update(c, id, patch); await persist(); },
    async remove(c, id) { delete col(c)[id]; await persist(); },
    async list(c, where) {
      return Object.entries(col(c)).filter(([, v]) => !where || v[where[0]] === where[1]).map(([id, v]) => ({ id, ...clone(v) }));
    },
    // Transactions run one at a time, so a read-check-write sequence is atomic.
    runTransaction(fn) {
      const run = queue.then(async () => {
        const result = await fn(ops);
        await persist();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

async function firestoreStore() {
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: config.firebase.projectId });
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  const read = value => {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(read);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, read(v)]));
    return value;
  };
  const snap = s => (s.exists ? { id: s.id, ...read(s.data()) } : null);
  const ref = (c, id) => db.collection(c).doc(id);
  return {
    kind: 'firebase',
    db,
    get: async (c, id) => snap(await ref(c, id).get()),
    set: async (c, id, value) => { await ref(c, id).set(value); },
    update: async (c, id, patch) => { await ref(c, id).update(patch); },
    remove: async (c, id) => { await ref(c, id).delete(); },
    async list(c, where) {
      const query = where ? db.collection(c).where(where[0], '==', where[1]) : db.collection(c);
      return (await query.get()).docs.map(snap);
    },
    runTransaction: fn => db.runTransaction(tx => fn({
      get: async (c, id) => snap(await tx.get(ref(c, id))),
      set: async (c, id, value) => { tx.set(ref(c, id), value); },
      update: async (c, id, patch) => { tx.update(ref(c, id), patch); },
    })),
  };
}

export async function createStore() {
  return config.mode === 'firebase' ? firestoreStore() : localStore();
}
