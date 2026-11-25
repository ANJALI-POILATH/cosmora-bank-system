import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Building2, Check, FileText, Gauge, HandCoins, LayoutDashboard, Mail, Pause, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { toPaise } from '../amount';
import { portal, usePortal } from './store';
import DashShell from './Shell';
import { Empty, Panel, Pill, Stat, day, money, time } from './ui';

const filters = ['PENDING', 'HOLD', 'APPROVED', 'REJECTED', 'ALL'];

function Decide({ customer, onClose }) {
  const [note, setNote] = useState(customer?.note || '');
  if (!customer) return null;
  const act = status => { portal.decide(customer.id, status, note.trim()); onClose(); };
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{customer.name} <Pill status={customer.status} /></DialogTitle>
    <DialogContent>
      <dl className="cz-review">
        <dt>Application</dt><dd>{customer.id}</dd><dt>Email</dt><dd>{customer.email}</dd>
        <dt>Mobile</dt><dd>{customer.phone || '—'}</dd><dt>Date of birth</dt><dd>{customer.dob || '—'}</dd>
        <dt>Address</dt><dd>{customer.address || '—'}</dd><dt>{customer.idType}</dt><dd>{customer.idNumber || '—'}</dd>
        <dt>Opening balance</dt><dd>{money(customer.openingMinor)}</dd><dt>Submitted</dt><dd>{time(customer.createdAt)}</dd>
        {customer.accountNumber && <><dt>Account</dt><dd>{customer.accountNumber}</dd></>}
      </dl>
      <div className="cz-docs">{customer.documents?.length ? customer.documents.map((d, i) =>
        <span key={i}><FileText size={15} />{d.name}</span>) : <span className="cz-muted">No documents on file</span>}</div>
      <TextField label="Note to customer (included in the email)" fullWidth multiline minRows={2} value={note} onChange={e => setNote(e.target.value)} sx={{ mt: 2 }} />
    </DialogContent>
    <DialogActions className="cz-decide">
      <Button color="error" variant="outlined" startIcon={<X size={16} />} onClick={() => act('REJECTED')}>Reject</Button>
      <Button color="warning" variant="outlined" startIcon={<Pause size={16} />} onClick={() => act('HOLD')}>Hold</Button>
      <Button color="success" variant="contained" startIcon={<Check size={16} />} onClick={() => act('APPROVED')}>Approve</Button>
    </DialogActions>
  </Dialog>;
}

function Customers({ customers, focus }) {
  const [filter, setFilter] = useState(focus || 'PENDING');
  const [open, setOpen] = useState(null);
  const rows = customers.filter(c => filter === 'ALL' || c.status === filter);
  return <Panel title="Account requests" sub="Review new customer applications" icon={Users}
    action={<div className="cz-seg small">{filters.map(f => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
      {f === 'ALL' ? 'All' : f === 'HOLD' ? 'On hold' : f[0] + f.slice(1).toLowerCase()}
      <small>{f === 'ALL' ? customers.length : customers.filter(c => c.status === f).length}</small></button>)}</div>}>
    {rows.length ? <div className="cz-table"><table>
      <thead><tr><th>Applicant</th><th>Submitted</th><th>Opening</th><th>Documents</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(c => <tr key={c.id}>
        <td><strong>{c.name}</strong><small>{c.email} · {c.id}</small></td>
        <td>{day(c.createdAt)}</td><td>{money(c.openingMinor)}</td><td>{c.documents?.length || 0}</td>
        <td><Pill status={c.status} />{c.accountNumber && <small>{c.accountNumber}</small>}</td>
        <td className="cz-actions">
          {c.status !== 'APPROVED' && <>
            <button type="button" className="ok" title="Approve" aria-label={'Approve ' + c.name} onClick={() => portal.decide(c.id, 'APPROVED')}><Check size={16} /></button>
            <button type="button" className="hold" title="Hold" aria-label={'Hold ' + c.name} onClick={() => setOpen(c)}><Pause size={16} /></button>
            <button type="button" className="no" title="Reject" aria-label={'Reject ' + c.name} onClick={() => setOpen(c)}><X size={16} /></button>
          </>}
          <Button size="small" onClick={() => setOpen(c)}>Review</Button>
        </td>
      </tr>)}</tbody>
    </table></div> : <Empty icon={Users} title="Nothing here" text={filter === 'PENDING' ? 'New applications appear here for review.' : 'No applications have this status.'} />}
    {open && <Decide key={open.id} customer={open} onClose={() => setOpen(null)} />}
  </Panel>;
}

function Loans({ loans, customers }) {
  const nameOf = email => customers.find(c => c.email === email)?.name || email;
  return <Panel title="Loan applications" sub="Approve or decline customer loans" icon={HandCoins}>
    {loans.length ? <div className="cz-table"><table>
      <thead><tr><th>Customer</th><th>Loan</th><th>Tenure</th><th>EMI</th><th>Status</th><th /></tr></thead>
      <tbody>{loans.map(l => <tr key={l.id}>
        <td><strong>{nameOf(l.email)}</strong><small>{l.email}</small></td>
        <td><strong>{l.kind} · {money(l.amountMinor)}</strong><small>{l.purpose}</small></td>
        <td>{l.months} mo · {l.rate}%</td><td>{money(l.emiMinor)}</td>
        <td><Pill status={l.status} />{l.status === 'APPROVED' && <small>{money(l.repaidMinor)} repaid</small>}</td>
        <td className="cz-actions">{l.status === 'PENDING' && <>
          <button type="button" className="ok" aria-label="Approve loan" onClick={() => portal.decideLoan(l.id, 'APPROVED')}><Check size={16} /></button>
          <button type="button" className="no" aria-label="Decline loan" onClick={() => portal.decideLoan(l.id, 'REJECTED')}><X size={16} /></button>
        </>}</td>
      </tr>)}</tbody>
    </table></div> : <Empty icon={HandCoins} title="No loan applications" />}
  </Panel>;
}

const blankBranch = { name: '', ifsc: '', address: '', phone: '' };
function Banks({ branches, directory, bank }) {
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  function save() {
    if (!edit.name.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(edit.ifsc.trim().toUpperCase()) || !edit.address.trim())
      return setError('Enter a name, an address and a valid 11-character IFSC (for example ANJA0H9L5PQ).');
    portal.saveBranch({ ...edit, ifsc: edit.ifsc.trim().toUpperCase() });
    setEdit(null); setError('');
  }
  return <>
    <Panel title="Cosmora branches" sub="IFSC, bank and address details, shared with customers" icon={Building2}
      action={<Button variant="contained" size="small" startIcon={<Plus size={15} />} onClick={() => setEdit({ ...blankBranch })}>Add branch</Button>}>
      <div className="cz-table"><table>
        <thead><tr><th>Branch</th><th>IFSC</th><th>Address</th><th>Phone</th><th /></tr></thead>
        <tbody>{branches.map(b => <tr key={b.id}>
          <td><strong>{b.name}</strong></td><td className="mono">{b.ifsc}</td><td className="wrap">{b.address}</td><td>{b.phone || '—'}</td>
          <td className="cz-actions">
            <button type="button" aria-label={'Edit ' + b.name} onClick={() => setEdit(b)}><Pencil size={15} /></button>
            {b.ifsc !== bank.ifsc && <button type="button" className="no" aria-label={'Delete ' + b.name} onClick={() => portal.deleteBranch(b.id)}><Trash2 size={15} /></button>}
          </td>
        </tr>)}</tbody>
      </table></div>
    </Panel>
    <Panel title="SharedBank network" sub="Partner banks, live from the network directory" icon={Building2}>
      <div className="cz-table"><table>
        <thead><tr><th>Bank</th><th>ID</th><th>IFSC</th><th>Status</th></tr></thead>
        <tbody>{directory.map(b => <tr key={b.bankId}>
          <td><strong>{b.bankName}</strong>{b.portalUrl && <small><a href={b.portalUrl} target="_blank" rel="noreferrer">{b.portalUrl.replace('https://', '')}</a></small>}</td>
          <td className="mono">{b.bankId}</td><td className="mono">{b.ifsc}</td><td><Pill status={b.status} /></td>
        </tr>)}</tbody>
      </table></div>
    </Panel>
    {edit && <Dialog open onClose={() => setEdit(null)} fullWidth maxWidth="sm">
      <DialogTitle>{edit.id ? 'Edit branch' : 'Add branch'}</DialogTitle>
      <DialogContent><div className="cz-form flush">
        {['name', 'ifsc', 'address', 'phone'].map(k => <TextField key={k} label={{ name: 'Branch name', ifsc: 'IFSC', address: 'Address', phone: 'Phone' }[k]}
          value={edit[k]} onChange={e => setEdit({ ...edit, [k]: e.target.value })} multiline={k === 'address'}
          disabled={k === 'ifsc' && edit.ifsc === bank.ifsc && !!edit.id} />)}
        {error && <Alert severity="error">{error}</Alert>}
      </div></DialogContent>
      <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></DialogActions>
    </Dialog>}
  </>;
}

function LimitRow({ label, sub, limit, onSave }) {
  const [per, setPer] = useState(String(limit.perTransferMinor / 100));
  const [daily, setDaily] = useState(String(limit.dailyMinor / 100));
  const [msg, setMsg] = useState('');
  function save() {
    const p = toPaise(per), d = toPaise(daily);
    if (!p || !d) return setMsg('Enter positive amounts.');
    if (p > d) return setMsg('The per-transfer limit cannot be above the daily limit.');
    onSave({ perTransferMinor: p, dailyMinor: d }); setMsg('Saved');
  }
  return <tr>
    <td><strong>{label}</strong>{sub && <small>{sub}</small>}</td>
    <td><TextField size="small" value={per} onChange={e => { setPer(e.target.value); setMsg(''); }} slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': 'Per transfer limit for ' + label } }} /></td>
    <td><TextField size="small" value={daily} onChange={e => { setDaily(e.target.value); setMsg(''); }} slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': 'Daily limit for ' + label } }} /></td>
    <td><Button size="small" variant="outlined" onClick={save}>Save</Button>{msg && <small className={msg === 'Saved' ? 'cz-good' : 'cz-bad'}>{msg}</small>}</td>
  </tr>;
}

function Limits({ customers, limits, defaultLimit }) {
  const active = customers.filter(c => c.status === 'APPROVED');
  return <Panel title="Transfer limits" sub="Amounts in INR. Customers see these limits, and transfers above them are blocked." icon={Gauge}>
    <div className="cz-table"><table className="cz-limit-table">
      <thead><tr><th>Customer</th><th>Per transfer</th><th>Daily</th><th /></tr></thead>
      <tbody>
        <LimitRow key={'default' + JSON.stringify(defaultLimit)} label="Default" sub="Applies to customers without their own limit" limit={defaultLimit} onSave={portal.setDefaultLimit} />
        {active.map(c => <LimitRow key={c.email + JSON.stringify(limits[c.email] || defaultLimit)} label={c.name} sub={c.email + (c.accountNumber ? ' · ' + c.accountNumber : '')}
          limit={limits[c.email] || defaultLimit} onSave={l => portal.setLimit(c.email, l)} />)}
      </tbody>
    </table></div>
  </Panel>;
}

function Outbox({ outbox }) {
  return <Panel title="Email notifications" sub="Messages sent to customers about their applications and loans" icon={Mail}
    action={outbox.length > 0 && <Button size="small" color="inherit" onClick={portal.clearOutbox}>Clear</Button>}>
    {outbox.length ? <div className="cz-mails">{outbox.map(m => <div className="cz-mail" key={m.id}>
      <small>To {m.to} · {time(m.sentAt)}</small><strong>{m.subject}</strong><p>{m.body}</p></div>)}</div>
      : <Empty icon={Mail} title="No emails yet" text="Approving, holding or rejecting a request sends an email." />}
  </Panel>;
}

export default function Admin({ bankApi, bank }) {
  const { session, directory, signOut } = bankApi;
  const store = usePortal();
  const [tab, setTab] = useState('overview');
  const count = s => store.customers.filter(c => c.status === s).length;
  const pendingLoans = store.loans.filter(l => l.status === 'PENDING').length;
  const partners = directory.filter(b => b.status === 'ACTIVE' && b.bankId !== bank.id);
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: count('PENDING') },
    { id: 'loans', label: 'Loans', icon: HandCoins, badge: pendingLoans },
    { id: 'banks', label: 'Bank management', icon: Building2 },
    { id: 'limits', label: 'Transfer limits', icon: Gauge },
    { id: 'mail', label: 'Email outbox', icon: Mail },
  ];
  const titles = { overview: 'Admin overview', customers: 'Customer management', loans: 'Loans', banks: 'Bank management', limits: 'Transfer limits', mail: 'Email outbox' };

  return <DashShell tabs={tabs} tab={tab} setTab={setTab} user={{ name: 'Cosmora Admin', email: session.email }} role="Administrator"
    onSignOut={signOut} title={titles[tab]} sub={bank.name + ' · ' + bank.id + ' · IFSC ' + bank.ifsc}>
    {tab === 'overview' && <>
      <div className="cz-stats">
        <Stat label="Pending requests" value={count('PENDING')} tone="coral" hint="Waiting for review" />
        <Stat label="On hold" value={count('HOLD')} />
        <Stat label="Active customers" value={count('APPROVED')} />
        <Stat label="Pending loans" value={pendingLoans} />
      </div>
      <Customers customers={store.customers} focus="PENDING" />
      <div className="cz-grid-2">
        <Outbox outbox={store.outbox.slice(0, 4)} />
        <Panel title="Network" sub={partners.length + ' active partner banks'} icon={Building2}
          action={<Button size="small" onClick={() => setTab('banks')}>Manage</Button>}>
          <div className="cz-partners light">{partners.slice(0, 14).map(b => <span key={b.bankId}>{b.bankName}</span>)}</div>
        </Panel>
      </div>
    </>}
    {tab === 'customers' && <Customers customers={store.customers} />}
    {tab === 'loans' && <Loans loans={store.loans} customers={store.customers} />}
    {tab === 'banks' && <Banks branches={store.branches} directory={directory} bank={bank} />}
    {tab === 'limits' && <Limits customers={store.customers} limits={store.limits} defaultLimit={store.defaultLimit} />}
    {tab === 'mail' && <Outbox outbox={store.outbox} />}
  </DashShell>;
}
