import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import config from './config.js';
import { HttpError, route } from './http.js';
import { publicAccount } from './ledger.js';

// Local stand-in for the X42 Worker API (/api/v1/...), with the same request
// and response shapes, so the portal behaves identically without Google
// credentials. Only same-bank transfers are possible offline.

const bank = config.bank;
const istDate = date => new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 10);

export function localX42(store, auth) {
  const router = Router();
  const user = async req => auth.verify((req.get('authorization') || '').replace(/^Bearer /, ''));

  router.get('/directory/banks', (req, res) => {
    res.json({ banks: [{ bankId: bank.id, bankName: bank.name, ifsc: bank.ifsc, status: 'ACTIVE' }] });
  });

  router.get('/banks/:bankId/dashboard', route(async (req, res) => {
    if (req.params.bankId !== bank.id) throw new HttpError(404, 'Unknown bank.');
    const { uid } = await user(req);
    const accounts = (await store.list('accounts', ['customerUid', uid])).filter(a => a.isSynthetic).map(publicAccount);
    const all = await store.list('local_transfers');
    const transfers = all.filter(t => t.fromUid === uid || t.toUid === uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50)
      .map(t => ({ transferId: t.transferId, type: 'INTERNAL', direction: t.fromUid === uid ? 'DEBIT' : 'CREDIT',
        sourceBankId: bank.id, destinationBankId: bank.id, amountMinor: t.amountMinor, currency: 'INR',
        status: t.status, code: t.code || null, createdAt: t.createdAt, updatedAt: t.createdAt }));
    res.json({ bank: { bankId: bank.id, bankName: bank.name, ifsc: bank.ifsc }, accounts, transfers });
  }));

  router.post('/banks/:bankId/transfers', route(async (req, res) => {
    if (req.params.bankId !== bank.id) throw new HttpError(404, 'Unknown bank.');
    const { uid } = await user(req);
    const key = req.get('idempotency-key') || '';
    if (!/^[A-Za-z0-9_.~-]{8,128}$/.test(key)) throw new HttpError(400, 'Provide an Idempotency-Key for this transfer.');
    const { fromAccountId, destinationIfsc, destinationAccountNumber, amountMinor, currency } = req.body || {};
    if (typeof fromAccountId !== 'string' || typeof destinationAccountNumber !== 'string' ||
      !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || currency !== 'INR') throw new HttpError(400, 'Invalid transfer details.');
    if (destinationIfsc !== bank.ifsc) {
      throw new HttpError(400, 'Interbank transfers need the live X42 network. Start the server in firebase mode to send to other banks.');
    }
    const [destination] = (await store.list('accounts', ['accountNumber', destinationAccountNumber.trim()])).filter(a => a.isSynthetic);

    const row = await store.runTransaction(async tx => {
      const idem = await tx.get('local_idempotency', uid + '_' + key);
      if (idem) return await tx.get('local_transfers', idem.transferId);
      const now = new Date();
      const usageId = fromAccountId + '_' + istDate(now);
      const [source, target, limits, usage] = [await tx.get('accounts', fromAccountId),
        destination ? await tx.get('accounts', destination.id) : null,
        await tx.get('transfer_limits', fromAccountId), await tx.get('daily_usage', usageId)];
      if (!source || source.customerUid !== uid || source.status !== 'ACTIVE') throw new HttpError(403, 'Choose one of your active accounts.');
      const perTransfer = limits?.perTransferMinor ?? config.defaults.perTransferMinor;
      const daily = limits?.dailyMinor ?? config.defaults.dailyMinor;
      const used = usage?.usedMinor || 0;
      let code = null;
      if (!target || target.status !== 'ACTIVE') code = 'DESTINATION_ACCOUNT_UNAVAILABLE';
      else if (target.id === source.id) code = 'SAME_ACCOUNT';
      else if (source.postedBalanceMinor - source.heldMinor < amountMinor) code = 'INSUFFICIENT_FUNDS';
      else if (amountMinor > perTransfer || amountMinor > daily - used) code = 'LIMIT_EXCEEDED';
      const transferId = `${bank.id}-LT-${randomUUID().slice(0, 8).toUpperCase()}`;
      const record = { transferId, createdAt: now, fromUid: uid, toUid: target?.customerUid || null, fromAccountId,
        toAccountId: target?.id || null, amountMinor, status: code ? 'REJECTED' : 'COMPLETED', code };
      if (!code) {
        await tx.update('accounts', source.id, { postedBalanceMinor: source.postedBalanceMinor - amountMinor, updatedAt: now });
        await tx.update('accounts', target.id, { postedBalanceMinor: target.postedBalanceMinor + amountMinor, updatedAt: now });
        await tx.set('daily_usage', usageId, { accountId: source.id, dateIST: istDate(now), usedMinor: used + amountMinor, updatedAt: now });
        for (const [accountId, direction] of [[source.id, 'DEBIT'], [target.id, 'CREDIT']]) {
          await tx.set('ledger_entries', transferId + '_' + direction, { entryId: transferId + '_' + direction, transferId,
            accountId, direction, amountMinor, postedAt: now, currency: 'INR', entryType: 'INTERNAL_TRANSFER' });
        }
      }
      await tx.set('local_transfers', transferId, record);
      await tx.set('local_idempotency', uid + '_' + key, { transferId, createdAt: now });
      return { ...record, createdAt: now.toISOString() };
    });
    res.status(201).json({ transferId: row.transferId, type: 'INTERNAL', amountMinor: row.amountMinor, status: row.status,
      code: row.code, createdAt: row.createdAt });
  }));

  return router;
}
