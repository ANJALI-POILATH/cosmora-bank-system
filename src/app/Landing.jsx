import { ArrowRight, ArrowLeftRight, BadgeCheck, HandCoins, PieChart, ShieldCheck, Undo2 } from 'lucide-react';
import { GlassCard, Logo } from './ui';

const features = [
  { icon: ArrowLeftRight, title: 'Instant transfers', text: 'Send money to any Cosmora account or across partner banks on the SharedBank network.' },
  { icon: PieChart, title: 'Portfolio at a glance', text: 'Balances, held funds, loans and activity in one calm view.' },
  { icon: HandCoins, title: 'Loans in minutes', text: 'Apply for personal, education, home or vehicle loans and track every repayment.' },
  { icon: ShieldCheck, title: 'Limits you control', text: 'Every account has per-transfer and daily limits set by our team.' },
];
const steps = [
  ['Apply online', 'Share your personal details, identity documents and an opening balance of ₹1,000 or more.'],
  ['We review', 'Our team approves your request, places it on hold or rejects it.'],
  ['Get notified', 'You get an email as soon as a decision is made.'],
  ['Start banking', 'Sign in to transfer money, manage your portfolio and apply for loans.'],
];

export default function Landing({ go, directory }) {
  const partners = directory.filter(b => b.status === 'ACTIVE' && b.bankId !== 'P625').length;
  return <div className="cz-landing">
    <div className="cz-stars" aria-hidden="true" />
    <header className="cz-nav">
      <Logo onClick={() => go('landing')} />
      <nav className="cz-nav-links">
        <a href="#features">Features</a><a href="#how">How it works</a><a href="#partners">Partners</a>
      </nav>
      <div className="cz-nav-cta">
        <button type="button" className="cz-link" onClick={() => go('login')}>Sign in</button>
        <button type="button" className="cz-link strong" onClick={() => go('register')}>Get Started</button>
      </div>
    </header>

    <section className="cz-hero">
      <div className="cz-hero-copy">
        <p className="cz-eyebrow">Simple. Secure. Commission-free.</p>
        <h1>Banking<br />Beyond <span className="cz-ring-word">The<svg viewBox="0 0 200 80" aria-hidden="true"><ellipse cx="100" cy="40" rx="96" ry="30" /><ellipse cx="104" cy="42" rx="90" ry="26" /></svg></span><br />Stars</h1>
        <p className="cz-hero-sub">Cosmora is your everyday bank: open an account online, move money in seconds and keep your whole portfolio in view.</p>
        <div className="cz-hero-actions">
          <button type="button" className="cz-cta" onClick={() => go('register')}>Open an account <ArrowRight size={17} /></button>
          <button type="button" className="cz-ghost" onClick={() => go('login')}>Sign in</button>
        </div>
      </div>
      <div className="cz-hero-art" aria-hidden="true">
        <div className="cz-orb" />
        <div className="cz-planet"><span /></div>
        <GlassCard className="cz-hero-card-a" number="P625 0000 0002" holder="ARIA NOVA" label="Savings" />
        <GlassCard className="cz-hero-card-b" variant="coral" number="P625 0000 0003" holder="LEO ORION" label="Debit card" />
        <div className="cz-hero-stat">
          <Undo2 className="cz-swirl" size={34} />
          <strong>{partners ? partners + ' banks' : 'SharedBank'}</strong>
          <span>connected for instant transfers</span>
        </div>
      </div>
    </section>

    <section className="cz-band">
      <div className="cz-band-light"><p>The easiest way to manage your money. Send and receive funds across the SharedBank network.</p></div>
      <div className="cz-band-coral">
        <div><strong>₹1K</strong><span>Minimum balance<br />to open</span></div>
        <div><strong>24×7</strong><span>Transfers, any<br />day of the week</span></div>
      </div>
    </section>

    <section className="cz-section" id="features">
      <p className="cz-eyebrow">Why Cosmora</p>
      <h2 className="cz-section-title">Everything you need, nothing you don't</h2>
      <div className="cz-features">{features.map(({ icon: Icon, title, text }) =>
        <article key={title} className="cz-feature"><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </section>

    <section className="cz-section" id="how">
      <p className="cz-eyebrow">How it works</p>
      <h2 className="cz-section-title">From application to first transfer</h2>
      <ol className="cz-steps">{steps.map(([title, text], i) =>
        <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></li>)}
      </ol>
    </section>

    <section className="cz-section" id="partners">
      <p className="cz-eyebrow">Partner network</p>
      <h2 className="cz-section-title">Send money to these banks</h2>
      <div className="cz-partners">
        {directory.length ? directory.filter(b => b.status === 'ACTIVE' && b.bankId !== 'P625').map(b =>
          <span key={b.bankId}><BadgeCheck size={15} />{b.bankName}</span>)
          : <span>Loading partner banks…</span>}
      </div>
    </section>

    <footer className="cz-footer">
      <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      <span>IFSC ANJA0H9L5PQ · A SharedBank network member</span>
      <span>© 2026 Cosmora Bank</span>
    </footer>
  </div>;
}
