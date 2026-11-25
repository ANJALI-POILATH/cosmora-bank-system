import { Fragment, useMemo, useState } from 'react';
import { Alert, Button, LinearProgress, MenuItem, Slider, TextField } from '@mui/material';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Gauge, HandCoins, LayoutDashboard, List, PieChart, Send, UserRound } from 'lucide-react';
import { toPaise } from '../amount';
import { portal, usePortal } from './store';
import DashShell from './Shell';
import { Empty, GlassCard, Panel, Pill, Stat, day, money, spaced, time } from './ui';

const rejectionNames = {
  INSUFFICIENT_FUNDS: 'Insufficient available balance',
  LIMIT_EXCEEDED: 'Transfer limit exceeded',
  DESTINATION_ACCOUNT_UNAVAILABLE: 'The destination is unavailable',
};
const istDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
const bankName = (directory, id) => directory.find(b => b.bankId === id)?.bankName || id;

function spentToday(transfers) {
  const today = istDay(Date.now());
  return transfers.filter(t => t.direction !== 'CREDIT' && t.status !== 'REJECTED' && istDay(t.createdAt) === today)
    .reduce((sum, t) => sum + t.amountMinor, 0);
}

function Activity({ rows, directory, limit }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!rows.length) return <Empty icon={ArrowLeftRight} title="No transfers yet" text="Your transfers appear here once they are submitted." />;
  return <ul className="cz-tx">{shown.map(row => {
    const incoming = row.direction === 'CREDIT';
    return <li key={row.transferId}>
      <span className={'cz-tx-icon' + (incoming ? ' in' : '')}>{incoming ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
      <span className="cz-tx-main"><strong>{row.type === 'INTERNAL' ? 'Cosmora transfer' : incoming
        ? 'From ' + bankName(directory, row.sourceBankId) : 'To ' + bankName(directory, row.destinationBankId)}</strong>
        <small>{time(row.createdAt)} · {row.transferId}</small>
        {row.code && <small className="cz-bad">{rejectionNames[row.code] || row.code.toLowerCase().replaceAll('_', ' ')}</small>}</span>
      <span className="cz-tx-side"><strong className={incoming ? 'cz-good' : ''}>{incoming ? '+' : '−'}{money(row.amountMinor)}</strong><Pill status={row.status} /></span>
    </li>;
  })}</ul>;
}

function TransferForm({ bank, accounts, transfers, directory, send, limit, onDone }) {
  const [type, setType] = useState('internal');
  const [from, setFrom] = useState('');
  const [destination, setDestination] = useState('');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const sources = accounts.filter(a => a.status === 'ACTIVE');
  const fromId = sources.some(a => a.accountId === from) ? from : (sources[0]?.accountId || '');
  const source = sources.find(a => a.accountId === fromId);
  const routes = directory.filter(b => b.bankId !== bank.id && b.status === 'ACTIVE');
  const route = destination ? (routes.find(b => b.ifsc === destination)?.ifsc || '') : (routes[0]?.ifsc || '');
  const target = type === 'internal' ? bank.ifsc : route;
  const used = spentToday(transfers);

  async function submit(event) {
    event.preventDefault();
    setError(''); setResult(null);
    const amountMinor = toPaise(amount);
    if (!fromId || !target || !number.trim() || amountMinor === null)
      return setError('Choose a source and destination, and enter a positive amount with at most two decimal places.');
    if (type === 'internal' && number.trim() === source?.accountNumber) return setError('You cannot transfer to the same account.');
    if (amountMinor > limit.perTransferMinor) return setError('This is above your per-transfer limit of ' + money(limit.perTransferMinor) + '.');
    if (used + amountMinor > limit.dailyMinor) return setError('This would exceed your daily limit. You have ' + money(Math.max(0, limit.dailyMinor - used)) + ' left today.');
    if (source && amountMinor > source.availableMinor) return setError('The amount is more than your available balance.');
    setBusy(true);
    try {
      const row = await send({ fromAccountId: fromId, destinationIfsc: target, destinationAccountNumber: number.trim(), amountMinor, currency: 'INR' });
      setResult(row); setNumber(''); setAmount('');
      onDone?.();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <form className="cz-form" onSubmit={submit}>
    <div className="cz-seg" role="group" aria-label="Transfer type">
      {[['internal', 'Within Cosmora'], ['interbank', 'Other bank']].map(([value, label]) =>
        <button key={value} type="button" aria-pressed={type === value} disabled={busy} onClick={() => setType(value)}>{label}</button>)}
    </div>
    <TextField select label="From account" required value={fromId} onChange={e => setFrom(e.target.value)} disabled={busy || !sources.length}>
      {sources.map(a => <MenuItem key={a.accountId} value={a.accountId}>{a.accountNumber} · {money(a.availableMinor)} available</MenuItem>)}
    </TextField>
    {type === 'interbank' && <TextField select label="Destination bank" required value={route} onChange={e => setDestination(e.target.value)} disabled={busy || !routes.length}>
      {routes.map(b => <MenuItem key={b.ifsc} value={b.ifsc}>{b.bankName} · {b.ifsc}</MenuItem>)}
    </TextField>}
    <TextField label="Destination account number" required value={number} onChange={e => setNumber(e.target.value)} disabled={busy}
      placeholder={type === 'internal' ? 'e.g. P62500000003' : ''} />
    <TextField label="Amount (INR)" required value={amount} onChange={e => setAmount(e.target.value)} disabled={busy}
      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      helperText={`Per transfer up to ${money(limit.perTransferMinor)} · ${money(Math.max(0, limit.dailyMinor - used))} left today`} />
    {error && <Alert severity="error">{error}</Alert>}
    {result && <Alert severity={result.status === 'REJECTED' ? 'warning' : 'success'}>
      {result.status === 'COMPLETED' ? 'Transfer completed' : result.status === 'REJECTED' ? 'Transfer rejected' : 'Transfer accepted'} · {result.transferId}
      {result.code ? ' · ' + (rejectionNames[result.code] || result.code) : ''}</Alert>}
    <Button type="submit" variant="contained" size="large" disabled={busy || !fromId || !target} startIcon={<Send size={16} />}>
      {busy ? 'Sending…' : 'Send money'}</Button>
  </form>;
}

const loanKinds = { Personal: 11.5, Education: 9.0, Home: 8.5, Vehicle: 9.75 };
const emi = (minor, rate, months) => {
  const r = rate / 1200;
  return Math.round(minor * r * (1 + r) ** months / ((1 + r) ** months - 1));
};

function Loans({ email, loans }) {
  const [kind, setKind] = useState('Personal');
  const [amount, setAmount] = useState('50000');
  const [months, setMonths] = useState(24);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [pay, setPay] = useState({});
  const minor = toPaise(amount);
  const monthly = minor ? emi(minor, loanKinds[kind], months) : 0;

  function apply(event) {
    event.preventDefault();
    if (!minor || minor < 1000000 || minor > 500000000) return setError('Enter an amount between ₹10,000 and ₹50,00,000.');
    if (!purpose.trim()) return setError('Tell us what the loan is for.');
    portal.applyLoan(email, { kind, amountMinor: minor, months, rate: loanKinds[kind], emiMinor: monthly, purpose: purpose.trim() });
    setError(''); setPurpose('');
  }

  return <div className="cz-grid-2">
    <Panel title="Apply for a loan" sub="Our team reviews every loan request" icon={HandCoins}>
      <form className="cz-form" onSubmit={apply}>
        <div className="cz-seg wrap" role="group" aria-label="Loan type">{Object.entries(loanKinds).map(([k, r]) =>
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}<small>{r}%</small></button>)}</div>
        <TextField label="Loan amount (INR)" value={amount} onChange={e => setAmount(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
        <div><span className="cz-label">Tenure · {months} months</span>
          <Slider value={months} min={6} max={120} step={6} onChange={(_, v) => setMonths(v)} aria-label="Tenure in months" /></div>
        <TextField label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)} />
        <div className="cz-emi"><span>Estimated EMI</span><strong>{money(monthly)}<small>/month</small></strong>
          <span>Total repayable {money(monthly * months)} at {loanKinds[kind]}% p.a.</span></div>
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large">Submit application</Button>
      </form>
    </Panel>
    <Panel title="Your loans" sub={loans.length + ' application(s)'} icon={List}>
      {loans.length ? <ul className="cz-loans">{loans.map(l => {
        const paid = l.repaidMinor / l.amountMinor * 100;
        return <li key={l.id}>
          <div className="cz-row between"><strong>{l.kind} loan · {money(l.amountMinor)}</strong><Pill status={l.status} /></div>
          <small>{l.id} · {l.months} months at {l.rate}% · EMI {money(l.emiMinor)} · applied {day(l.createdAt)}</small>
          {l.status === 'APPROVED' && <>
            <LinearProgress variant="determinate" value={paid} className="cz-progress" />
            <small>{money(l.repaidMinor)} repaid · {money(l.amountMinor - l.repaidMinor)} outstanding</small>
            <div className="cz-row">
              <TextField size="small" label="Repay (INR)" value={pay[l.id] ?? ''} onChange={e => setPay({ ...pay, [l.id]: e.target.value })} />
              <Button variant="outlined" onClick={() => { const m = toPaise(pay[l.id] || ''); if (m) { portal.repayLoan(l.id, m); setPay({ ...pay, [l.id]: '' }); } }}>Record payment</Button>
            </div></>}
          {l.status === 'PENDING' && <div><Button size="small" color="inherit" onClick={() => portal.cancelLoan(l.id)}>Withdraw application</Button></div>}
        </li>;
      })}</ul> : <Empty icon={HandCoins} title="No loans yet" text="Applications you submit appear here." />}
    </Panel>
  </div>;
}

function Profile({ email, profile }) {
  const [form, setForm] = useState({ name: profile?.name || '', phone: profile?.phone || '', address: profile?.address || '' });
  const [saved, setSaved] = useState(false);
  const field = key => ({ value: form[key], onChange: e => { setSaved(false); setForm({ ...form, [key]: e.target.value }); } });
  return <Panel title="Personal details" sub="Keep your contact details up to date" icon={UserRound} className="cz-narrow">
    <form className="cz-form" onSubmit={e => { e.preventDefault(); portal.updateProfile(email, form); setSaved(true); }}>
      <TextField label="Full name" {...field('name')} />
      <TextField label="Email" value={email} disabled />
      <TextField label="Mobile number" {...field('phone')} />
      <TextField label="Address" multiline minRows={2} {...field('address')} />
      {saved && <Alert severity="success">Your details are saved.</Alert>}
      <Button type="submit" variant="contained">Save changes</Button>
    </form>
  </Panel>;
}

export default function Customer({ bankApi, bank }) {
  const { session, data, loaded, error, directory, send, refresh, signOut } = bankApi;
  const store = usePortal();
  const [tab, setTab] = useState('overview');
  const profile = store.customers.find(c => c.email === session.email);
  const limit = store.limits[session.email] || store.defaultLimit;
  const loans = store.loans.filter(l => l.email === session.email);
  const accounts = data.accounts;
  const totals = useMemo(() => {
    const balance = accounts.reduce((s, a) => s + a.availableMinor, 0);
    const held = accounts.reduce((s, a) => s + a.heldMinor, 0);
    const done = data.transfers.filter(t => t.status === 'COMPLETED');
    const inflow = done.filter(t => t.direction === 'CREDIT').reduce((s, t) => s + t.amountMinor, 0);
    const outflow = done.filter(t => t.direction !== 'CREDIT').reduce((s, t) => s + t.amountMinor, 0);
    const debt = loans.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.amountMinor - l.repaidMinor, 0);
    return { balance, held, inflow, outflow, debt };
  }, [accounts, data.transfers, loans]);
  const name = profile?.name || session.email.split('@')[0];
  const first = name.split(' ')[0];
  const used = spentToday(data.transfers);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transfer', label: 'Transfer', icon: Send },
    { id: 'activity', label: 'Activity', icon: List },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'loans', label: 'Loans', icon: HandCoins, badge: loans.filter(l => l.status === 'PENDING').length },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];
  const titles = { overview: 'Hello, ' + first, transfer: 'Send money', activity: 'Activity', portfolio: 'Portfolio', loans: 'Loans', profile: 'Profile' };
  const subs = { overview: 'Here is where your money stands today.', transfer: 'Send to Cosmora accounts or partner banks.', activity: 'Your 50 most recent transfers',
    portfolio: 'Everything you hold with Cosmora', loans: 'Apply for loans and track repayments', profile: 'Your personal details' };

  const cards = <div className="cz-cards">{accounts.map((a, i) =>
    <div key={a.accountId} className="cz-acct">
      <GlassCard variant={i % 2 ? 'coral' : 'glass'} number={spaced(a.accountNumber)} holder={name.toUpperCase()} label={a.label || 'Savings'} />
      <div className="cz-acct-meta"><span>Available</span><strong>{money(a.availableMinor)}</strong>
        <small>Held {money(a.heldMinor)} · Posted {money(a.postedBalanceMinor)}</small></div>
    </div>)}</div>;

  return <DashShell tabs={tabs} tab={tab} setTab={setTab} user={{ name, email: session.email }} role="Customer"
    onRefresh={refresh} onSignOut={signOut} title={titles[tab]} sub={subs[tab]}>
    {error && <Alert severity="error">{error}</Alert>}
    {!loaded && <LinearProgress className="cz-progress" />}
    {loaded && !accounts.length && <Alert severity="info">No Cosmora account is linked to this sign-in yet.</Alert>}

    {tab === 'overview' && <>
      {cards}
      <div className="cz-stats">
        <Stat label="Total available" value={money(totals.balance)} tone="coral" />
        <Stat label="Money in" value={money(totals.inflow)} hint="Completed incoming transfers" />
        <Stat label="Money out" value={money(totals.outflow)} hint="Completed outgoing transfers" />
        <Stat label="Left to send today" value={money(Math.max(0, limit.dailyMinor - used))} hint={'Daily limit ' + money(limit.dailyMinor)} />
      </div>
      <div className="cz-grid-2 wide-left">
        <Panel title="Recent activity" icon={List} action={<Button size="small" onClick={() => setTab('activity')}>View all</Button>}>
          <Activity rows={data.transfers} directory={directory} limit={5} /></Panel>
        <Panel title="Quick transfer" icon={Send}>
          {accounts.length ? <TransferForm bank={bank} accounts={accounts} transfers={data.transfers} directory={directory} send={send} limit={limit} />
            : <Empty icon={Send} title="No account to send from" />}</Panel>
      </div>
    </>}

    {tab === 'transfer' && <div className="cz-grid-2 wide-left">
      <Panel title="New transfer" icon={Send}>
        {accounts.length ? <TransferForm bank={bank} accounts={accounts} transfers={data.transfers} directory={directory} send={send} limit={limit} />
          : <Empty icon={Send} title="No account to send from" />}</Panel>
      <Panel title="Your limits" sub="Set by Cosmora" icon={Gauge}>
        <div className="cz-limits">
          <div><span>Per transfer</span><strong>{money(limit.perTransferMinor)}</strong></div>
          <div><span>Daily</span><strong>{money(limit.dailyMinor)}</strong></div>
          <LinearProgress variant="determinate" value={Math.min(100, used / limit.dailyMinor * 100)} className="cz-progress" />
          <small>{money(used)} used today</small>
        </div>
        <div className="cz-ifsc"><span>Your bank</span><strong>{bank.name}</strong><span>IFSC</span><strong>{bank.ifsc}</strong></div>
      </Panel>
    </div>}

    {tab === 'activity' && <Panel title="All transfers" icon={List}><Activity rows={data.transfers} directory={directory} /></Panel>}

    {tab === 'portfolio' && <>
      {cards}
      <div className="cz-stats">
        <Stat label="Deposits" value={money(totals.balance + totals.held)} tone="coral" />
        <Stat label="Held funds" value={money(totals.held)} />
        <Stat label="Loans outstanding" value={money(totals.debt)} />
        <Stat label="Net worth" value={money(totals.balance + totals.held - totals.debt)} />
      </div>
      <Panel title="Breakdown" icon={PieChart}>
        <div className="cz-breakdown">
          {(() => {
            const parts = [['Available', totals.balance, 'a'], ['Held', totals.held, 'b'], ['Loans', totals.debt, 'c']];
            const sum = parts.reduce((s, p) => s + p[1], 0) || 1;
            return <>
              <div className="cz-bar">{parts.map(([k, v, c]) => v > 0 && <span key={k} className={c} style={{ width: (v / sum * 100) + '%' }} />)}</div>
              <ul>{parts.map(([k, v, c]) => <li key={k}><i className={c} />{k}<strong>{money(v)}</strong></li>)}</ul>
            </>;
          })()}
        </div>
        <dl className="cz-review pad">{accounts.map(a => <Fragment key={a.accountId}><dt>{a.accountNumber}</dt>
          <dd>{a.label} · {a.status} · {a.currency}</dd></Fragment>)}</dl>
      </Panel>
    </>}

    {tab === 'loans' && <Loans email={session.email} loans={loans} />}
    {tab === 'profile' && <Profile key={session.email} email={session.email} profile={profile} />}
  </DashShell>;
}
