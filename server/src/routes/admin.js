import { Router } from 'express';
import { HttpError, paiseFromRupees, route, rupees, text } from '../http.js';
import { publicAccount } from '../ledger.js';
import { authenticate, publicProfile, requireAdmin } from '../profiles.js';

const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function bankFields(body, { partial = false } = {}) {
  const required = !partial;
  const fields = {
    bankName: text(body.bankName, { field: 'Bank name', max: 80, required }),
    ifsc: text(body.ifsc, { field: 'IFSC', pattern: ifscPattern, message: 'IFSC must look like ABCD0123456.', required })?.toUpperCase(),
    bankId: text(body.bankId, { field: 'Bank ID', pattern: /^P\d{3}$/, message: 'Bank ID must look like P123.', required: false }),
    branch: text(body.branch, { field: 'Branch', max: 80, required: false }),
    address: text(body.address, { field: 'Address', max: 200, required: false }),
    city: text(body.city, { field: 'City', max: 60, required: false }),
    state: text(body.state, { field: 'State', max: 60, required: false }),
    pincode: text(body.pincode, { field: 'PIN code', pattern: /^\d{6}$/, message: 'Enter a 6-digit PIN code.', required: false }),
    phone: text(body.phone, { field: 'Phone', max: 20, required: false }),
    email: text(body.email, { field: 'Email', max: 120, required: false }),
    portalUrl: text(body.portalUrl, { field: 'Portal URL', max: 200, pattern: /^https:\/\//, message: 'Use an https:// URL.', required: false }),
  };
  return fields;
}

export function adminRoutes(ctx) {
  const { store, auth, ledger, mail } = ctx;
  const router = Router();
  router.use(authenticate(ctx), requireAdmin);

  router.get('/stats', route(async (req, res) => {
    const [users, loans, accounts] = [await store.list('portal_users'), await store.list('loans'), await store.list('accounts')];
    const customers = users.filter(u => u.role === 'CUSTOMER');
    const count = status => customers.filter(u => u.status === status).length;
    res.json({
      applications: { PENDING: count('PENDING'), ON_HOLD: count('ON_HOLD'), APPROVED: count('APPROVED'), REJECTED: count('REJECTED'), CLOSED: count('CLOSED') },
      loans: { PENDING: loans.filter(l => l.status === 'PENDING').length, ACTIVE: loans.filter(l => l.status === 'ACTIVE').length,
        outstandingMinor: loans.filter(l => l.status === 'ACTIVE').reduce((s, l) => s + l.outstandingMinor, 0) },
      deposits: { accounts: accounts.filter(a => a.isSynthetic && a.status === 'ACTIVE').length,
        totalMinor: accounts.filter(a => a.isSynthetic && a.status === 'ACTIVE').reduce((s, a) => s + a.postedBalanceMinor, 0) },
    });
  }));

  // ---------- Customer applications ----------
  router.get('/applications', route(async (req, res) => {
    const users = (await store.list('portal_users')).filter(u => u.role === 'CUSTOMER');
    const status = req.query.status;
    res.json({ applications: users.filter(u => !status || status === 'ALL' || u.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicProfile) });
  }));

  router.post('/applications/:uid/decision', route(async (req, res) => {
    const profile = await store.get('portal_users', req.params.uid);
    if (!profile || profile.role !== 'CUSTOMER') throw new HttpError(404, 'Application not found.');
    const action = req.body?.action;
    const note = text(req.body?.note, { field: 'Note', max: 500, required: action === 'HOLD' || action === 'REJECT' });
    const transitions = { APPROVE: 'APPROVED', HOLD: 'ON_HOLD', REJECT: 'REJECTED' };
    const status = transitions[action];
    if (!status) throw new HttpError(400, 'Choose approve, hold or reject.');
    if (!['PENDING', 'ON_HOLD'].includes(profile.status)) throw new HttpError(409, 'This application has already been ' + profile.status.toLowerCase().replace('_', ' ') + '.');

    let account = profile.accountId ? { accountId: profile.accountId, accountNumber: profile.accountNumber } : null;
    if (status === 'APPROVED' && !account) {
      // Opens the X42 account with the applicant's initial balance.
      account = await ledger.openAccount({ uid: profile.uid, label: 'Savings account', openingMinor: profile.initialDepositMinor });
    }
    const now = new Date().toISOString();
    await store.update('portal_users', profile.uid, {
      status, reviewNote: note, reviewedAt: now, reviewedBy: req.profile.email || req.user.email, updatedAt: now,
      ...(account && { accountId: account.accountId, accountNumber: account.accountNumber }),
      history: [...(profile.history || []), { status, note: note || (status === 'APPROVED' ? 'Application approved' : ''), at: now, by: 'admin' }],
    });
    const email = await mail(profile.email, status, { name: profile.fullName, note, accountNumber: account?.accountNumber });
    res.json({ profile: publicProfile(await store.get('portal_users', profile.uid)), email: { status: email.status, delivery: email.delivery } });
  }));

  // ---------- Customers, accounts & transfer limits ----------
  router.get('/customers', route(async (req, res) => {
    const users = (await store.list('portal_users')).filter(u => u.role === 'CUSTOMER' && ['APPROVED', 'CLOSED'].includes(u.status));
    const customers = await Promise.all(users.map(async u => ({
      ...publicProfile(u),
      accounts: await Promise.all((await ledger.accountsOf(u.uid)).map(async a => ({ ...publicAccount(a), limits: await ledger.limitsFor(a.id) }))),
    })));
    res.json({ customers: customers.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')) });
  }));

  router.put('/accounts/:accountId/limits', route(async (req, res) => {
    const account = await store.get('accounts', req.params.accountId);
    if (!account?.isSynthetic) throw new HttpError(404, 'Account not found.');
    const perTransferMinor = paiseFromRupees(req.body?.perTransfer);
    const dailyMinor = paiseFromRupees(req.body?.daily);
    if (!perTransferMinor || !dailyMinor || perTransferMinor > 1_00_00_000_00 || dailyMinor > 1_00_00_000_00) {
      throw new HttpError(400, 'Enter limits between ₹0.01 and ₹1,00,00,000.');
    }
    if (perTransferMinor > dailyMinor) throw new HttpError(400, 'The per-transfer limit cannot exceed the daily limit.');
    await ledger.setLimits(account.id, { perTransferMinor, dailyMinor });
    const owner = await store.get('portal_users', account.customerUid);
    if (owner?.email) await mail(owner.email, 'limitsChanged', { name: owner.fullName, perTransfer: rupees(perTransferMinor), daily: rupees(dailyMinor) });
    res.json({ accountId: account.id, perTransferMinor, dailyMinor });
  }));

  router.post('/accounts/:accountId/status', route(async (req, res) => {
    const account = await store.get('accounts', req.params.accountId);
    if (!account?.isSynthetic) throw new HttpError(404, 'Account not found.');
    const status = req.body?.status;
    if (!['ACTIVE', 'FROZEN'].includes(status) || account.status === 'CLOSED') throw new HttpError(400, 'Accounts can be frozen or reactivated.');
    await ledger.setStatus(account.id, status);
    res.json({ accountId: account.id, status });
  }));

  // ---------- Bank management (common table) ----------
  router.post('/banks', route(async (req, res) => {
    const bank = bankFields(req.body || {});
    if (await store.get('bank_directory', bank.ifsc)) throw new HttpError(409, 'A bank with this IFSC already exists.');
    const now = new Date().toISOString();
    await store.set('bank_directory', bank.ifsc, { ...bank, isOwn: false, source: 'MANUAL', createdAt: now, updatedAt: now });
    res.status(201).json(await store.get('bank_directory', bank.ifsc));
  }));

  router.put('/banks/:ifsc', route(async (req, res) => {
    const existing = await store.get('bank_directory', req.params.ifsc);
    if (!existing) throw new HttpError(404, 'Bank not found.');
    const { ifsc, ...fields } = bankFields(req.body || {});
    if (ifsc !== existing.ifsc) throw new HttpError(400, 'IFSC cannot be changed. Add a new bank instead.');
    await store.update('bank_directory', existing.id, { ...fields, updatedAt: new Date().toISOString() });
    res.json(await store.get('bank_directory', existing.id));
  }));

  router.delete('/banks/:ifsc', route(async (req, res) => {
    const existing = await store.get('bank_directory', req.params.ifsc);
    if (!existing) throw new HttpError(404, 'Bank not found.');
    if (existing.isOwn) throw new HttpError(409, 'Your own bank cannot be removed.');
    await store.remove('bank_directory', existing.id);
    res.json({ ok: true });
  }));

  // Upserts banks from the live SharedBank directory (fetched by the browser).
  router.post('/banks/import', route(async (req, res) => {
    const incoming = Array.isArray(req.body?.banks) ? req.body.banks.slice(0, 200) : [];
    let added = 0, updated = 0;
    const now = new Date().toISOString();
    for (const item of incoming) {
      if (!ifscPattern.test(item?.ifsc || '') || typeof item.bankName !== 'string') continue;
      const existing = await store.get('bank_directory', item.ifsc);
      const shared = { bankName: item.bankName.slice(0, 80), bankId: /^P\d{3}$/.test(item.bankId) ? item.bankId : '',
        portalUrl: /^https:\/\//.test(item.portalUrl || '') ? item.portalUrl : '', networkStatus: item.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' };
      if (existing) { await store.update('bank_directory', existing.id, { ...shared, updatedAt: now }); updated++; }
      else { await store.set('bank_directory', item.ifsc, { ...shared, ifsc: item.ifsc, isOwn: false, source: 'SHAREDBANK', createdAt: now, updatedAt: now }); added++; }
    }
    res.json({ added, updated });
  }));

  // ---------- Loans ----------
  router.get('/loans', route(async (req, res) => {
    const status = req.query.status;
    const loans = (await store.list('loans')).filter(l => !status || status === 'ALL' || l.status === status);
    res.json({ loans: loans.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }));

  router.post('/loans/:id/decision', route(async (req, res) => {
    const loan = await store.get('loans', req.params.id);
    if (!loan) throw new HttpError(404, 'Loan not found.');
    if (loan.status !== 'PENDING') throw new HttpError(409, 'This loan has already been decided.');
    const action = req.body?.action;
    if (!['APPROVE', 'REJECT'].includes(action)) throw new HttpError(400, 'Choose approve or reject.');
    const note = text(req.body?.note, { field: 'Note', max: 500, required: action === 'REJECT' });
    const now = new Date().toISOString();
    if (action === 'APPROVE') {
      // Disburse into the customer's account through the bank ledger.
      await ledger.post({ accountId: loan.accountId, uid: loan.uid, deltaMinor: loan.principalMinor, entryType: 'LOAN_DISBURSAL', reference: loan.id });
    }
    const status = action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
    await store.update('loans', loan.id, { status, decisionNote: note, decidedAt: now, decidedBy: req.profile.email || req.user.email,
      updatedAt: now, ...(status === 'ACTIVE' && { disbursedAt: now }) });
    await mail(loan.email, 'loanDecision', { name: loan.customerName, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      amount: rupees(loan.principalMinor), loanId: loan.id, note });
    res.json(await store.get('loans', loan.id));
  }));

  // ---------- Email outbox ----------
  router.get('/outbox', route(async (req, res) => {
    const mails = await store.list('outbox');
    res.json({ emails: mails.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100) });
  }));

  return router;
}
