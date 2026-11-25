import { Wifi } from 'lucide-react';

export const money = minor => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((minor || 0) / 100);
export const time = value => value ? new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(value)) : '—';
export const day = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : '—';
export const spaced = number => (number || '').replace(/(.{4})/g, '$1 ').trim();

export function Logo({ onClick, light = true }) {
  return <button type="button" className={'cz-logo' + (light ? '' : ' dark')} onClick={onClick}>
    <span className="cz-logo-mark" aria-hidden="true"><i /><i /></span>
    <span>Cosmora</span>
  </button>;
}

export function GlassCard({ number = 'P625 0000 0000', holder = 'COSMORA MEMBER', label = 'Savings', variant = 'glass', className = '' }) {
  return <div className={'cz-card cz-card-' + variant + ' ' + className}>
    <div className="cz-card-top"><span className="cz-card-chip" /><span className="cz-card-label">{label}</span></div>
    <div className="cz-card-number">{number}</div>
    <div className="cz-card-foot">
      <span>{holder}</span>
      <span className="cz-card-orbs" aria-hidden="true"><i /><i /></span>
    </div>
    <Wifi className="cz-card-wave" size={18} aria-hidden="true" />
  </div>;
}

const pills = {
  PENDING: 'Pending', APPROVED: 'Approved', HOLD: 'On hold', REJECTED: 'Rejected', CLOSED: 'Closed',
  PROCESSING: 'Processing', COMPLETED: 'Completed', MANUAL_REVIEW: 'Manual review', ACTIVE: 'Active', INACTIVE: 'Inactive',
};
export function Pill({ status }) {
  return <span className={'cz-pill cz-pill-' + (status || '').toLowerCase()}>{pills[status] || status}</span>;
}

export function Panel({ title, sub, icon: Icon, action, children, className = '' }) {
  return <section className={'cz-panel ' + className}>
    {(title || action) && <header className="cz-panel-head">
      <div className="cz-panel-title">{Icon && <span className="cz-panel-icon"><Icon size={17} /></span>}
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></div>
      {action}
    </header>}
    {children}
  </section>;
}

export function Empty({ icon: Icon, title, text }) {
  return <div className="cz-empty">{Icon && <Icon size={24} />}<strong>{title}</strong>{text && <p>{text}</p>}</div>;
}

export function Stat({ label, value, hint, tone = '' }) {
  return <div className={'cz-stat ' + tone}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}
