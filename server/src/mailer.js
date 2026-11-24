import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import config from './config.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(title, lines, cta) {
  return `<!doctype html><html><body style="margin:0;background:#07040f;font-family:Segoe UI,Arial,sans-serif;color:#efe9ff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#120726,#07040f);padding:32px 12px">
  <tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#170d33;border:1px solid #3b2a6b;border-radius:18px">
  <tr><td style="padding:28px 32px 8px;letter-spacing:4px;font-size:12px;color:#c4b5fd;font-weight:700">✦ ${escape(config.bank.name.toUpperCase())}</td></tr>
  <tr><td style="padding:4px 32px 0;font-family:Georgia,serif;font-size:30px;color:#ffffff">${escape(title)}</td></tr>
  <tr><td style="padding:16px 32px 8px;font-size:15px;line-height:1.7;color:#d6ccf5">${lines.map(l => `<p style="margin:0 0 12px">${l}</p>`).join('')}</td></tr>
  ${cta ? `<tr><td style="padding:8px 32px 28px"><a href="${escape(cta.url)}" style="display:inline-block;background:#a78bfa;color:#12082b;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${escape(cta.label)}</a></td></tr>` : ''}
  <tr><td style="padding:16px 32px 24px;border-top:1px solid #2c1f55;font-size:12px;color:#8f84b5">IFSC ${escape(config.bank.ifsc)} · This is an automated message from a test banking system with synthetic balances.</td></tr>
  </table></td></tr></table></body></html>`;
}

export const templates = {
  received: ({ name }) => ({
    subject: 'We received your account application',
    title: 'Application received',
    lines: [`Hi ${escape(name)},`, `Thank you for applying to open an account with ${escape(config.bank.name)}. Our team will review your details and documents shortly.`, 'You can sign in at any time to check the status of your application.'],
  }),
  APPROVED: ({ name, accountNumber, note }) => ({
    subject: 'Your account has been approved 🎉',
    title: 'Welcome aboard',
    lines: [`Hi ${escape(name)},`, `Your ${escape(config.bank.name)} account is approved and ready to use.`,
      `<strong>Account number:</strong> ${escape(accountNumber)}<br><strong>IFSC:</strong> ${escape(config.bank.ifsc)}`,
      ...(note ? [`<em>Note from our team:</em> ${escape(note)}`] : [])],
  }),
  ON_HOLD: ({ name, note }) => ({
    subject: 'Your account application is on hold',
    title: 'Action needed',
    lines: [`Hi ${escape(name)},`, 'Your application has been placed on hold while we need a little more from you.',
      `<strong>Reason:</strong> ${escape(note || 'Please review your details and documents.')}`,
      'Sign in to update your details or upload new documents, then resubmit.'],
  }),
  REJECTED: ({ name, note }) => ({
    subject: 'Update on your account application',
    title: 'Application not approved',
    lines: [`Hi ${escape(name)},`, `We’re sorry, but we couldn’t approve your application to ${escape(config.bank.name)} at this time.`,
      ...(note ? [`<strong>Reason:</strong> ${escape(note)}`] : [])],
  }),
  loanDecision: ({ name, status, amount, loanId, note }) => ({
    subject: `Your loan ${loanId} was ${status === 'APPROVED' ? 'approved' : 'declined'}`,
    title: status === 'APPROVED' ? 'Loan approved' : 'Loan declined',
    lines: [`Hi ${escape(name)},`, status === 'APPROVED'
      ? `Your loan of <strong>${escape(amount)}</strong> has been approved and credited to your account.`
      : `Your loan application for ${escape(amount)} was not approved.`, ...(note ? [`<em>Note:</em> ${escape(note)}`] : [])],
  }),
  limitsChanged: ({ name, perTransfer, daily }) => ({
    subject: 'Your transfer limits were updated',
    title: 'Transfer limits updated',
    lines: [`Hi ${escape(name)},`, `Your limits are now <strong>${escape(perTransfer)}</strong> per transfer and <strong>${escape(daily)}</strong> per day.`],
  }),
};

export function createMailer(store) {
  // Without SMTP settings, mail is rendered and saved to the outbox only,
  // so every notification can still be inspected from the admin console.
  const transport = config.smtp ? nodemailer.createTransport(config.smtp) : nodemailer.createTransport({ jsonTransport: true });
  return async function send(to, template, data) {
    const content = templates[template](data);
    const html = layout(content.title, content.lines, { label: 'Open Cosmora Bank', url: config.portalUrl });
    const id = randomUUID();
    const record = { id, to, subject: content.subject, template, html, createdAt: new Date(), delivery: config.smtp ? 'SMTP' : 'OUTBOX_ONLY' };
    try {
      const info = await transport.sendMail({ from: config.mailFrom, to, subject: content.subject, html });
      record.status = 'SENT';
      record.messageId = info.messageId || null;
    } catch (error) {
      record.status = 'FAILED';
      record.error = error.message;
      console.error('Email to ' + to + ' failed:', error.message);
    }
    await store.set('outbox', id, record);
    if (!config.smtp) console.log(`[mail] ${content.subject} -> ${to} (saved to outbox; set SMTP_* to deliver)`);
    return record;
  };
}
