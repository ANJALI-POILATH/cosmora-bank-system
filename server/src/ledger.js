import config from './config.js';
import { HttpError } from './http.js';

// Writes the bank's X42 ledger collections using the same schema the
// SharedBank Worker reads: accounts, ledger_entries and transfer_limits.
// In firebase mode these are the real documents in the bank's Firestore.

const bankId = config.bank.id;
const balanceInteger = value => Number.isSafeInteger(value) && value >= 0;

export const publicAccount = account => ({
  accountId: account.id || account.accountId, accountNumber: account.accountNumber,
  label: account.label || 'Savings account', status: account.status,
  postedBalanceMinor: account.postedBalanceMinor, heldMinor: account.heldMinor,
  availableMinor: account.postedBalanceMinor - account.heldMinor, currency: 'INR',
});

export function createLedger(store) {
  const accountsOf = async uid => (await store.list('accounts', ['customerUid', uid]))
    .filter(a => a.isSynthetic === true).sort((a, b) => a.id.localeCompare(b.id));

  async function openAccount({ uid, label = 'Savings account', openingMinor = 0 }) {
    // Pick the next free sequence (P625-002 / P62500000002, ...) outside the
    // transaction, then claim it inside so two approvals can never collide.
    for (let attempt = 0; attempt < 5; attempt++) {
      const counter = await store.get('counters', 'accounts');
      let seq = counter?.next || 2;
      while (await store.get('accounts', `${bankId}-${String(seq).padStart(3, '0')}`)) seq++;
      const accountId = `${bankId}-${String(seq).padStart(3, '0')}`;
      const accountNumber = `${bankId}${String(seq).padStart(8, '0')}`;
      const created = await store.runTransaction(async tx => {
        const [existing, latest] = [await tx.get('accounts', accountId), await tx.get('counters', 'accounts')];
        if (existing || (latest?.next || 2) > seq) return null;
        const now = new Date();
        await tx.set('counters', 'accounts', { next: seq + 1, updatedAt: now });
        await tx.set('accounts', accountId, {
          accountId, customerUid: uid, accountNumber, isSynthetic: true, currency: 'INR', status: 'ACTIVE',
          postedBalanceMinor: openingMinor, heldMinor: 0, label, createdAt: now, updatedAt: now,
        });
        await tx.set('transfer_limits', accountId, {
          accountId, perTransferMinor: config.defaults.perTransferMinor, dailyMinor: config.defaults.dailyMinor, updatedAt: now,
        });
        if (openingMinor > 0) {
          const entryId = `${bankId}-CF-SEED-${accountId}_CREDIT`;
          await tx.set('ledger_entries', entryId, {
            entryId, transferId: `${bankId}-CF-SEED-${accountId}`, accountId, amountMinor: openingMinor,
            postedAt: now, direction: 'CREDIT', currency: 'INR', entryType: 'DEMO_SEED',
          });
        }
        return { accountId, accountNumber };
      });
      if (created) return created;
    }
    throw new HttpError(409, 'Could not allocate an account number. Try again.');
  }

  // Credits (+) or debits (-) an account once per reference. Debits only use
  // the available balance (posted minus funds held by in-flight transfers).
  async function post({ accountId, uid, deltaMinor, entryType, reference }) {
    const direction = deltaMinor >= 0 ? 'CREDIT' : 'DEBIT';
    const amountMinor = Math.abs(deltaMinor);
    const transferId = `${bankId}-${entryType}-${reference}`;
    const entryId = transferId + '_' + direction;
    return store.runTransaction(async tx => {
      const [account, entry] = [await tx.get('accounts', accountId), await tx.get('ledger_entries', entryId)];
      if (entry) return { alreadyPosted: true };
      if (!account || account.isSynthetic !== true || (uid && account.customerUid !== uid)) throw new HttpError(404, 'Account not found.');
      if (account.status !== 'ACTIVE') throw new HttpError(409, 'This account is not active.');
      const available = account.postedBalanceMinor - account.heldMinor;
      if (direction === 'DEBIT' && amountMinor > available) throw new HttpError(409, 'Insufficient available balance.');
      const next = account.postedBalanceMinor + deltaMinor;
      if (!balanceInteger(next)) throw new HttpError(409, 'This would exceed the account balance limit.');
      const now = new Date();
      await tx.update('accounts', accountId, { postedBalanceMinor: next, updatedAt: now });
      await tx.set('ledger_entries', entryId, { entryId, transferId, accountId, amountMinor, postedAt: now, direction, currency: 'INR', entryType });
      return { postedBalanceMinor: next };
    });
  }

  async function limitsFor(accountId) {
    const limits = await store.get('transfer_limits', accountId);
    return { perTransferMinor: limits?.perTransferMinor ?? config.defaults.perTransferMinor,
      dailyMinor: limits?.dailyMinor ?? config.defaults.dailyMinor, custom: !!limits };
  }

  async function setLimits(accountId, { perTransferMinor, dailyMinor }) {
    await store.set('transfer_limits', accountId, { accountId, perTransferMinor, dailyMinor, updatedAt: new Date() });
  }

  async function setStatus(accountId, status) {
    await store.update('accounts', accountId, { status, updatedAt: new Date() });
  }

  async function setLabel(accountId, label) {
    await store.update('accounts', accountId, { label, updatedAt: new Date() });
  }

  return { accountsOf, openAccount, post, limitsFor, setLimits, setStatus, setLabel };
}
