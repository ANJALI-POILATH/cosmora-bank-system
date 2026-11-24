import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Router } from 'express';
import config from '../config.js';
import { HttpError, paiseFromRupees, route, text } from '../http.js';
import { loanProducts, quote } from '../loans.js';
import { publicAccount } from '../ledger.js';
import { authenticate, personalDetails, publicProfile, requireCustomer } from '../profiles.js';

export function customerRoutes(ctx) {
  const { store, auth, ledger } = ctx;
  const router = Router();
  router.use(authenticate(ctx));

  // Documents can be opened by their owner or by an administrator.
  router.get('/documents/:uid/:docId', route(async (req, res) => {
    const { uid, docId } = req.params;
    if (req.profile.role !== 'ADMIN' && req.user.uid !== uid) throw new HttpError(403, 'Not allowed.');
    const owner = await store.get('portal_users', uid);
    const doc = owner?.documents?.find(d => d.id === docId);
    if (!doc) throw new HttpError(404, 'Document not found.');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `inline; filename="${doc.name.replace(/"/g, '')}"`);
    res.type(doc.contentType).sendFile(join(config.uploadDir, uid, doc.file));
  }));

  // ---------- Profile (customer CRUD on their own relationship) ----------
  router.get('/profile', (req, res) => res.json(publicProfile(req.profile)));

  router.put('/profile', requireCustomer, route(async (req, res) => {
    const updates = personalDetails(req.body || {}, { partial: true });
    if (!Object.keys(updates).length) throw new HttpError(400, 'Nothing to update.');
    const now = new Date().toISOString();
    await store.update('portal_users', req.user.uid, { ...updates, updatedAt: now,
      history: [...req.profile.history, { status: req.profile.status, note: 'Profile details updated', at: now, by: 'customer' }] });
    res.json(publicProfile(await store.get('portal_users', req.user.uid)));
  }));

  // Closing the relationship closes every account and disables the login.
  router.delete('/profile', requireCustomer, route(async (req, res) => {
    const uid = req.user.uid;
    const [accounts, loans] = [await ledger.accountsOf(uid), await store.list('loans', ['uid', uid])];
    if (loans.some(l => ['PENDING', 'ACTIVE'].includes(l.status))) throw new HttpError(409, 'Repay or cancel your loans before closing.');
    if (accounts.some(a => a.heldMinor > 0)) throw new HttpError(409, 'Wait for in-flight transfers to finish before closing.');
    for (const account of accounts.filter(a => a.status === 'ACTIVE')) await ledger.setStatus(account.id, 'CLOSED');
    const now = new Date().toISOString();
    await store.update('portal_users', uid, { status: 'CLOSED', closedAt: now, updatedAt: now,
      history: [...req.profile.history, { status: 'CLOSED', note: text(req.body?.reason, { field: 'Reason', max: 300, required: false }) || 'Closed by customer', at: now, by: 'customer' }] });
    await auth.setDisabled(uid, true);
    res.json({ status: 'CLOSED' });
  }));

  // ---------- Portfolio ----------
  router.get('/portfolio', requireCustomer, route(async (req, res) => {
    const uid = req.user.uid;
    const [accounts, loans] = [await ledger.accountsOf(uid), await store.list('loans', ['uid', uid])];
    const withLimits = await Promise.all(accounts.map(async a => ({ ...publicAccount(a), primary: a.id === req.profile.accountId,
      openedAt: a.createdAt, limits: await ledger.limitsFor(a.id) })));
    const open = withLimits.filter(a => a.status === 'ACTIVE');
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const totalMinor = open.reduce((s, a) => s + a.postedBalanceMinor, 0);
    const outstandingMinor = activeLoans.reduce((s, l) => s + l.outstandingMinor, 0);
    res.json({ accounts: withLimits, summary: { totalMinor, availableMinor: open.reduce((s, a) => s + a.availableMinor, 0),
      outstandingMinor, netWorthMinor: totalMinor - outstandingMinor, activeLoans: activeLoans.length, openAccounts: open.length } });
  }));

  router.post('/accounts', requireCustomer, route(async (req, res) => {
    const label = text(req.body?.label, { field: 'Account name', max: 40 });
    const accounts = (await ledger.accountsOf(req.user.uid)).filter(a => a.status === 'ACTIVE');
    if (accounts.length >= 5) throw new HttpError(409, 'You can hold up to 5 open accounts.');
    const created = await ledger.openAccount({ uid: req.user.uid, label, openingMinor: 0 });
    res.status(201).json(created);
  }));

  const ownAccount = async (req) => {
    const account = await store.get('accounts', req.params.id);
    if (!account || account.customerUid !== req.user.uid) throw new HttpError(404, 'Account not found.');
    return account;
  };

  router.patch('/accounts/:id', requireCustomer, route(async (req, res) => {
    await ownAccount(req);
    await ledger.setLabel(req.params.id, text(req.body?.label, { field: 'Account name', max: 40 }));
    res.json({ ok: true });
  }));

  router.delete('/accounts/:id', requireCustomer, route(async (req, res) => {
    const account = await ownAccount(req);
    if (account.id === req.profile.accountId) throw new HttpError(409, 'Your primary account can only be closed by closing your relationship in Profile.');
    if (account.postedBalanceMinor !== 0 || account.heldMinor !== 0) throw new HttpError(409, 'Move the balance out before closing this account.');
    if ((await store.list('loans', ['accountId', account.id])).some(l => ['PENDING', 'ACTIVE'].includes(l.status))) {
      throw new HttpError(409, 'This account is linked to a loan.');
    }
    await ledger.setStatus(account.id, 'CLOSED');
    res.json({ ok: true });
  }));

  // ---------- Loans ----------
  router.get('/loans', route(async (req, res) => {
    const loans = await store.list('loans', ['uid', req.user.uid]);
    res.json({ loans: loans.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), products: loanProducts });
  }));

  router.post('/loans', requireCustomer, route(async (req, res) => {
    const { type, accountId } = req.body || {};
    const principalMinor = paiseFromRupees(req.body?.amount);
    const termMonths = Number(req.body?.termMonths);
    const terms = quote(type, principalMinor, termMonths);
    const account = await store.get('accounts', String(accountId || ''));
    if (!account || account.customerUid !== req.user.uid || account.status !== 'ACTIVE') throw new HttpError(400, 'Choose one of your active accounts.');
    const open = (await store.list('loans', ['uid', req.user.uid])).filter(l => ['PENDING', 'ACTIVE'].includes(l.status));
    if (open.length >= 3) throw new HttpError(409, 'You can have at most 3 pending or active loans.');
    const id = 'LN-' + randomUUID().slice(0, 8).toUpperCase();
    const now = new Date().toISOString();
    const loan = { id, loanId: id, uid: req.user.uid, customerName: req.profile.fullName, email: req.profile.email || req.user.email,
      accountId: account.id, accountNumber: account.accountNumber, type, label: loanProducts[type].label,
      principalMinor, termMonths, ...terms, outstandingMinor: terms.totalPayableMinor, paidMinor: 0,
      purpose: text(req.body?.purpose, { field: 'Purpose', max: 300 }), status: 'PENDING', repayments: [], createdAt: now, updatedAt: now };
    await store.set('loans', id, loan);
    res.status(201).json(loan);
  }));

  const ownLoan = async req => {
    const loan = await store.get('loans', req.params.id);
    if (!loan || loan.uid !== req.user.uid) throw new HttpError(404, 'Loan not found.');
    return loan;
  };

  router.post('/loans/:id/cancel', requireCustomer, route(async (req, res) => {
    const loan = await ownLoan(req);
    if (loan.status !== 'PENDING') throw new HttpError(409, 'Only pending applications can be cancelled.');
    await store.update('loans', loan.id, { status: 'CANCELLED', updatedAt: new Date().toISOString() });
    res.json({ ok: true });
  }));

  router.post('/loans/:id/repay', requireCustomer, route(async (req, res) => {
    const loan = await ownLoan(req);
    if (loan.status !== 'ACTIVE') throw new HttpError(409, 'This loan is not active.');
    const requested = req.body?.amount ? paiseFromRupees(req.body.amount) : loan.emiMinor;
    if (!requested || requested <= 0) throw new HttpError(400, 'Enter a valid amount.');
    const amountMinor = Math.min(requested, loan.outstandingMinor);
    const accountId = String(req.body?.accountId || loan.accountId);
    const reference = `${loan.id}-R${loan.repayments.length + 1}`;
    const result = await ledger.post({ accountId, uid: req.user.uid, deltaMinor: -amountMinor, entryType: 'LOAN_REPAYMENT', reference });
    if (result.alreadyPosted) throw new HttpError(409, 'That payment was already recorded. Refresh to see it.');
    const outstandingMinor = loan.outstandingMinor - amountMinor;
    const now = new Date().toISOString();
    await store.update('loans', loan.id, { outstandingMinor, paidMinor: (loan.paidMinor || 0) + amountMinor,
      status: outstandingMinor === 0 ? 'CLOSED' : 'ACTIVE', updatedAt: now,
      repayments: [...loan.repayments, { reference, amountMinor, accountId, at: now }] });
    res.json(await store.get('loans', loan.id));
  }));

  return router;
}
