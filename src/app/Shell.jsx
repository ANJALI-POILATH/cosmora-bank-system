import { useState } from 'react';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
import { Logo } from './ui';

export default function DashShell({ tabs, tab, setTab, user, role, onRefresh, onSignOut, children, title, sub }) {
  const [open, setOpen] = useState(false);
  return <div className="cz-dash">
    <aside className={'cz-side' + (open ? ' open' : '')}>
      <Logo />
      <span className="cz-side-role">{role}</span>
      <nav aria-label="Sections">
        {tabs.map(({ id, label, icon: Icon, badge }) => <button key={id} type="button" className={tab === id ? 'active' : ''}
          aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setOpen(false); }}>
          <Icon size={18} /> <span>{label}</span>{badge ? <em>{badge}</em> : null}
        </button>)}
      </nav>
      <div className="cz-side-foot">
        <div className="cz-side-user"><span className="cz-avatar">{(user.name || user.email)[0].toUpperCase()}</span>
          <span><strong>{user.name || user.email}</strong><small>{user.email}</small></span></div>
        <button type="button" onClick={onSignOut}><LogOut size={17} /> Sign out</button>
      </div>
    </aside>
    <div className="cz-dash-main">
      <header className="cz-top">
        <button type="button" className="cz-menu" aria-label="Open menu" onClick={() => setOpen(!open)}><Menu size={20} /></button>
        <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
        {onRefresh && <button type="button" className="cz-icon-btn" onClick={() => onRefresh()} aria-label="Refresh"><RefreshCw size={17} /></button>}
      </header>
      <main className="cz-dash-content">{children}</main>
    </div>
    {open && <div className="cz-scrim" onClick={() => setOpen(false)} />}
  </div>;
}
