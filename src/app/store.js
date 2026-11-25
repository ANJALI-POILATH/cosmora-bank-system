// Browser-side store for the portal features the SharedBank Worker does not expose
// (registrations, approvals, loans, transfer limits, branch table, email outbox).
// Balances, sign-in and transfers stay on the Worker.
import { useSyncExternalStore } from 'react';
import { readStorage, saveStorage } from '../live-api';

export const ADMIN_EMAIL = 'admin@cosmora.bank';
export const MIN_OPENING_MINOR = 100000; // INR 1,000

const KEY = 'cosmora-portal-store-v1';
const now = () => new Date().toISOString();
const id = prefix => prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

const seed = () => ({
  customers: [
    { id: 'CUS-ARIA', name: 'Aria Nova', email: 'aria@cosmora.bank', phone: '', address: '', dob: '',
      idType: 'PAN', idNumber: '', documents: [], openingMinor: 1000000, accountNumber: 'P62500000002',
      status: 'APPROVED', createdAt: '2026-11-01T09:00:00.000Z', decidedAt: '2026-11-01T10:00:00.000Z', note: '' },
    { id: 'CUS-LEO', name: 'Leo Orion', email: 'leo@cosmora.bank', phone: '', address: '', dob: '',
      idType: 'PAN', idNumber: '', documents: [], openingMinor: 1000000, accountNumber: 'P62500000003',
      status: 'APPROVED', createdAt: '2026-11-01T09:05:00.000Z', decidedAt: '2026-11-01T10:00:00.000Z', note: '' },
  ],
  limits: {
    'aria@cosmora.bank': { perTransferMinor: 2500000, dailyMinor: 5000000 },
    'leo@cosmora.bank': { perTransferMinor: 2500000, dailyMinor: 5000000 },
  },
  defaultLimit: { perTransferMinor: 2500000, dailyMinor: 5000000 },
  loans: [],
  branches: [
    { id: 'BR-HQ', name: 'Cosmora Bank · Head Office', ifsc: 'ANJA0H9L5PQ', address: 'Cosmora Towers, MG Road, Bengaluru 560001', phone: '080 4000 6250' },
  ],
  outbox: [],
});

let state = readStorage(localStorage, KEY, null) || seed();
const listeners = new Set();
function set(update) {
  state = { ...state, ...update(state) };
  saveStorage(localStorage, KEY, state);
  listeners.forEach(fn => fn());
}
window.addEventListener('storage', event => {
  if (event.key !== KEY) return;
  state = readStorage(localStorage, KEY, null) || seed();
  listeners.forEach(fn => fn());
});

export function usePortal() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);
}
export const getPortal = () => state;

const templates = {
  APPROVED: c => ({ subject: 'Your Cosmora Bank account is approved',
    body: `Hi ${c.name}, your account application ${c.id} has been approved. Account number: ${c.accountNumber}. Welcome aboard!` }),
  HOLD: c => ({ subject: 'Your Cosmora Bank application is on hold',
    body: `Hi ${c.name}, we need a little more information before we can approve application ${c.id}.${c.note ? ' Note from our team: ' + c.note : ''}` }),
  REJECTED: c => ({ subject: 'Update on your Cosmora Bank application',
    body: `Hi ${c.name}, we are unable to approve application ${c.id} at this time.${c.note ? ' Reason: ' + c.note : ''}` }),
};
const mail = (to, subject, body) => ({ id: id('MAIL'), to, subject, body, sentAt: now() });

export const portal = {
  register(form) {
    const email = form.email.trim().toLowerCase();
    if (state.customers.some(c => c.email === email && c.status !== 'REJECTED')) {
      throw new Error('An application or account already exists for this email.');
    }
    const record = { ...form, email, id: id('APP'), status: 'PENDING', createdAt: now(), accountNumber: '', note: '' };
    set(s => ({
      customers: [record, ...s.customers],
      outbox: [mail(email, 'We received your Cosmora Bank application',
        `Hi ${record.name}, thanks for applying. Your application ID is ${record.id}. Our team will review it shortly.`), ...s.outbox],
    }));
    return record;
  },
  decide(customerId, status, note = '') {
    set(s => {
      let sent = null;
      const used = new Set(s.customers.map(c => c.accountNumber).filter(Boolean));
      let next = 4;
      const customers = s.customers.map(c => {
        if (c.id !== customerId) return c;
        let accountNumber = c.accountNumber;
        if (status === 'APPROVED' && !accountNumber) {
          while (used.has('P625' + String(next).padStart(8, '0'))) next++;
          accountNumber = 'P625' + String(next).padStart(8, '0');
        }
        const updated = { ...c, status, note, accountNumber, decidedAt: now() };
        const t = templates[status](updated);
        sent = mail(c.email, t.subject, t.body);
        return updated;
      });
      return { customers, outbox: sent ? [sent, ...s.outbox] : s.outbox };
    });
  },
  updateProfile(email, patch) {
    set(s => {
      const exists = s.customers.some(c => c.email === email);
      const customers = exists ? s.customers.map(c => c.email === email ? { ...c, ...patch } : c)
        : [{ id: id('CUS'), email, status: 'APPROVED', createdAt: now(), documents: [], ...patch }, ...s.customers];
      return { customers };
    });
  },
  setLimit(email, limit) { set(s => ({ limits: { ...s.limits, [email]: limit } })); },
  setDefaultLimit(limit) { set(() => ({ defaultLimit: limit })); },
  limitFor: email => state.limits[email] || state.defaultLimit,

  applyLoan(email, loan) {
    const record = { ...loan, id: id('LN'), email, status: 'PENDING', repaidMinor: 0, createdAt: now() };
    set(s => ({ loans: [record, ...s.loans] }));
    return record;
  },
  decideLoan(loanId, status) {
    set(s => {
      let sent = null;
      const loans = s.loans.map(l => {
        if (l.id !== loanId) return l;
        sent = mail(l.email, `Your ${l.kind.toLowerCase()} loan was ${status === 'APPROVED' ? 'approved' : 'declined'}`,
          `Loan ${l.id} for ₹${(l.amountMinor / 100).toLocaleString('en-IN')} has been ${status.toLowerCase()}.`);
        return { ...l, status, decidedAt: now() };
      });
      return { loans, outbox: sent ? [sent, ...s.outbox] : s.outbox };
    });
  },
  repayLoan(loanId, minor) {
    set(s => ({ loans: s.loans.map(l => l.id !== loanId ? l : {
      ...l, repaidMinor: Math.min(l.amountMinor, l.repaidMinor + minor),
      status: l.repaidMinor + minor >= l.amountMinor ? 'CLOSED' : l.status,
    }) }));
  },
  cancelLoan(loanId) { set(s => ({ loans: s.loans.filter(l => l.id !== loanId || l.status !== 'PENDING') })); },

  saveBranch(branch) {
    set(s => ({ branches: branch.id && s.branches.some(b => b.id === branch.id)
      ? s.branches.map(b => b.id === branch.id ? branch : b)
      : [...s.branches, { ...branch, id: id('BR') }] }));
  },
  deleteBranch(branchId) { set(s => ({ branches: s.branches.filter(b => b.id !== branchId) })); },
  clearOutbox() { set(() => ({ outbox: [] })); },
};
