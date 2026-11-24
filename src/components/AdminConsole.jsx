import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Badge, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, IconButton,
  InputAdornment, MenuItem, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import { api, openDocument, rupeesInput } from '../api';
import { liveApi } from '../live-api';
import { money, time, useCountUp } from '../format';
import { glass } from '../theme';
import { ConfirmDialog, Empty, Field, NoteDialog, Panel, StatusChip, TopBar, serifTitle, statusLabel, tabIndicator } from './ui';

function Stat({ label, value, minor, icon, tone, onClick }) {
  const animated = useCountUp(minor ?? value ?? 0);
  return <Box onClick={onClick} className="rise" sx={{ ...glass, p: 2.5, display: 'flex', gap: 2, alignItems: 'center', cursor: onClick ? 'pointer' : 'default',
    transition: 'transform .2s, box-shadow .2s', '&:hover': onClick ? { transform: 'translateY(-3px)', boxShadow: `0 0 30px ${tone}44` } : {} }}>
    <Avatar sx={{ width: 46, height: 46, bgcolor: 'transparent', border: '1px solid', borderColor: tone, color: tone, boxShadow: `0 0 18px ${tone}55` }}>{icon}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{minor !== undefined ? money(animated) : animated}</Typography>
    </Box>
  </Box>;
}

const Search = ({ value, onChange, placeholder }) => <TextField size="small" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
  sx={{ minWidth: { sm: 260 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />;

// ---------------- Applications ----------------
function ApplicationDrawer({ app, token, onClose, onDecided }) {
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');
  const mobile = useMediaQuery(theme => theme.breakpoints.down('sm'));
  const actionable = app && ['PENDING', 'ON_HOLD'].includes(app.status);
  const decide = action => async note => {
    const result = await api(`/admin/applications/${app.uid}/decision`, { token, body: { action, note } });
    onDecided(result);
  };
  const dialogs = {
    APPROVE: { title: 'Approve application', confirmLabel: 'Approve & open account', color: 'success',
      description: `Opens an X42 account with ${app ? money(app.initialDepositMinor || 0) : ''} and emails the customer.` },
    HOLD: { title: 'Put on hold', confirmLabel: 'Put on hold', color: 'warning', noteRequired: true, description: 'Tell the customer what they need to fix. They can update and resubmit.' },
    REJECT: { title: 'Reject application', confirmLabel: 'Reject', color: 'error', noteRequired: true, description: 'The customer is emailed with your reason.' },
  };
  return <Drawer anchor="right" open={!!app} onClose={onClose} slotProps={{ paper: { sx: { width: mobile ? '100%' : 520, background: 'linear-gradient(160deg,#1d1140,#0b0620)', borderLeft: '1px solid rgba(196,181,253,.15)' } } }}>
    {app && <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="overline" sx={{ color: 'primary.light' }}>Application review</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseRoundedIcon /></IconButton>
      </Stack>
      <Typography variant="h3" sx={{ fontSize: '2.2rem' }}>{app.fullName}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 2 }}><StatusChip status={app.status} /><Typography variant="body2" sx={{ color: 'text.secondary' }}>Submitted {time(app.createdAt)}</Typography></Stack>
      {actionable && <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="contained" color="success" onClick={() => setDialog('APPROVE')}>Approve</Button>
        <Button variant="outlined" color="warning" onClick={() => setDialog('HOLD')}>Hold</Button>
        <Button variant="outlined" color="error" onClick={() => setDialog('REJECT')}>Reject</Button>
      </Stack>}
      {app.accountNumber && <Alert severity="success" sx={{ mb: 2 }}>Account {app.accountNumber}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>Personal</Typography>
      <Field label="Email" value={app.email} /><Field label="Mobile" value={app.phone && '+91 ' + app.phone} />
      <Field label="Date of birth" value={app.dob} /><Field label="Gender" value={app.gender} /><Field label="Occupation" value={app.occupation} />
      <Field label="Address" value={[app.addressLine, app.city, app.state, app.pincode].filter(Boolean).join(', ')} />
      <Divider sx={{ my: 2 }} />
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>KYC</Typography>
      <Field label="PAN" value={app.pan} mono /><Field label="Aadhaar" value={app.aadhaarMasked} mono />
      <Field label="Initial balance" value={app.initialDepositMinor ? money(app.initialDepositMinor) : '—'} />
      {(app.documents || []).map(doc => <Field key={doc.id} label={doc.label} value={<Button size="small" startIcon={<DescriptionRoundedIcon />}
        onClick={() => openDocument(token, app.uid, doc.id).catch(e => setError(e.message))}>{doc.name}</Button>} />)}
      {!app.documents?.length && <Typography variant="body2" sx={{ color: 'text.secondary' }}>No documents uploaded.</Typography>}
      <Divider sx={{ my: 2 }} />
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>History</Typography>
      {[...(app.history || [])].reverse().map((h, i) => <Box key={i} sx={{ py: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={h.status} /><Typography variant="caption" sx={{ color: 'text.secondary' }}>{time(h.at)} · {h.by}</Typography></Stack>
        {h.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{h.note}</Typography>}
      </Box>)}
      {dialog && <NoteDialog open {...dialogs[dialog]} onClose={() => setDialog(null)} onConfirm={decide(dialog)} />}
    </Box>}
  </Drawer>;
}

function Applications({ token, notify, counts, onChanged }) {
  const [filter, setFilter] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setRows((await api('/admin/applications?status=' + filter, { token })).applications); setError(''); } catch (e) { setError(e.message); }
  }, [token, filter]);
  useEffect(() => { setRows(null); load(); }, [load]);
  const q = query.trim().toLowerCase();
  const shown = (rows || []).filter(r => !q || [r.fullName, r.email, r.pan, r.phone].some(v => (v || '').toLowerCase().includes(q)));

  return <Panel title="Customer applications" subtitle="Review documents, then approve, hold or reject. Each decision emails the customer."
    action={<Search value={query} onChange={setQuery} placeholder="Search name, email, PAN" />}>
    <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, v) => v && setFilter(v)} color="primary" sx={{ mb: 2, flexWrap: 'wrap' }}>
      {['PENDING', 'ON_HOLD', 'APPROVED', 'REJECTED', 'CLOSED', 'ALL'].map(s => <ToggleButton key={s} value={s} sx={{ gap: 1 }}>
        {s === 'ALL' ? 'All' : statusLabel(s)}{counts?.[s] ? <Chip size="small" label={counts[s]} sx={{ height: 18, fontSize: 11 }} /> : null}
      </ToggleButton>)}
    </ToggleButtonGroup>
    {error && <Alert severity="error">{error}</Alert>}
    {!rows ? <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(167,139,250,.1)', borderRadius: 3 }} />
      : shown.length ? <TableContainer><Table>
        <TableHead><TableRow><TableCell>Applicant</TableCell><TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Submitted</TableCell>
          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Opening balance</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>{shown.map(r => <TableRow key={r.uid} hover onClick={() => setSelected(r)} sx={{ cursor: 'pointer' }}>
          <TableCell><Typography sx={{ fontWeight: 600 }}>{r.fullName}</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{r.email}</Typography></TableCell>
          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{time(r.createdAt)}</TableCell>
          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{r.initialDepositMinor ? money(r.initialDepositMinor) : '—'}</TableCell>
          <TableCell><StatusChip status={r.status} /></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer> : <Empty title="No applications" text={`Nothing ${filter === 'ALL' ? '' : statusLabel(filter).toLowerCase()} right now.`} />}
    <ApplicationDrawer app={selected} token={token} onClose={() => setSelected(null)} onDecided={result => {
      setSelected(result.profile);
      notify(`${result.profile.fullName}: ${statusLabel(result.profile.status)} · email ${result.email.status === 'SENT' ? (result.email.delivery === 'SMTP' ? 'sent' : 'saved to outbox') : 'failed'}`);
      load(); onChanged();
    }} />
  </Panel>;
}

// ---------------- Customers & limits ----------------
function LimitsDialog({ account, token, onClose, onSaved }) {
  const [per, setPer] = useState('');
  const [daily, setDaily] = useState('');
  useEffect(() => { if (account) { setPer(rupeesInput(account.limits.perTransferMinor)); setDaily(rupeesInput(account.limits.dailyMinor)); } }, [account]);
  const rupee = { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { inputMode: 'decimal' } };
  return <ConfirmDialog open={!!account} title="Transfer limits" confirmLabel="Save limits" onClose={onClose}
    onConfirm={async () => { await api(`/admin/accounts/${account.accountId}/limits`, { token, method: 'PUT', body: { perTransfer: per, daily } }); onSaved(); }}>
    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{account?.label} · {account?.accountNumber}. The X42 network enforces these on every transfer; the customer is emailed.</Typography>
    <Stack spacing={2}>
      <TextField label="Per transfer" value={per} onChange={e => setPer(e.target.value.replace(/[^\d.]/g, ''))} slotProps={rupee} />
      <TextField label="Per day" value={daily} onChange={e => setDaily(e.target.value.replace(/[^\d.]/g, ''))} slotProps={rupee} />
    </Stack>
  </ConfirmDialog>;
}

function Customers({ token, notify }) {
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState('');
  const [limits, setLimits] = useState(null);
  const [freeze, setFreeze] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setRows((await api('/admin/customers', { token })).customers); setError(''); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const q = query.trim().toLowerCase();
  const shown = (rows || []).filter(c => !q || [c.fullName, c.email, ...c.accounts.map(a => a.accountNumber)].some(v => (v || '').toLowerCase().includes(q)));

  return <Panel title="Customers & transfer limits" subtitle="Balances come from the bank ledger. Set limits per account, or freeze an account."
    action={<Search value={query} onChange={setQuery} placeholder="Search name, email, account" />}>
    {error && <Alert severity="error">{error}</Alert>}
    {!rows ? <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(167,139,250,.1)', borderRadius: 3 }} />
      : shown.length ? <Stack spacing={2}>{shown.map(c => <Box key={c.uid} sx={{ p: 2, borderRadius: '18px', border: '1px solid rgba(196,181,253,.14)', background: 'rgba(10,5,26,.35)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Avatar sx={{ background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', color: '#12082b', fontWeight: 700 }}>{(c.fullName || c.email || '?').charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 650 }} noWrap>{c.fullName}</Typography><StatusChip status={c.status} /></Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{c.email}{c.phone ? ' · +91 ' + c.phone : ''}</Typography>
          </Box>
        </Stack>
        <TableContainer><Table size="small">
          <TableHead><TableRow><TableCell>Account</TableCell><TableCell align="right">Balance</TableCell>
            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Limits (transfer / day)</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{c.accounts.map(a => <TableRow key={a.accountId}>
            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.label}</Typography>
              <Stack direction="row" spacing={1} alignItems="center"><Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{a.accountNumber}</Typography>
                {a.status !== 'ACTIVE' && <StatusChip status={a.status} />}</Stack></TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(a.postedBalanceMinor)}</TableCell>
            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{money(a.limits.perTransferMinor)} / {money(a.limits.dailyMinor)}{!a.limits.custom && <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}> (default)</Typography>}</TableCell>
            <TableCell align="right">{a.status !== 'CLOSED' && <>
              <Tooltip title="Set transfer limits"><IconButton size="small" onClick={() => setLimits(a)} aria-label="Set limits"><TuneRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title={a.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}><IconButton size="small" color={a.status === 'FROZEN' ? 'info' : 'default'} onClick={() => setFreeze(a)} aria-label="Freeze or unfreeze"><AcUnitRoundedIcon fontSize="small" /></IconButton></Tooltip>
            </>}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
      </Box>)}</Stack> : <Empty title="No customers yet" text="Approved applications appear here." />}
    <LimitsDialog account={limits} token={token} onClose={() => setLimits(null)} onSaved={() => { notify('Transfer limits updated'); load(); }} />
    <ConfirmDialog open={!!freeze} title={freeze?.status === 'FROZEN' ? 'Unfreeze account?' : 'Freeze account?'} confirmLabel={freeze?.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
      color={freeze?.status === 'FROZEN' ? 'primary' : 'warning'} onClose={() => setFreeze(null)}
      onConfirm={async () => { await api(`/admin/accounts/${freeze.accountId}/status`, { token, body: { status: freeze.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN' } }); notify('Account updated'); load(); }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{freeze?.status === 'FROZEN' ? 'The customer can transact again.' : 'A frozen account cannot send transfers or repay loans until it is unfrozen.'}</Typography>
    </ConfirmDialog>
  </Panel>;
}

// ---------------- Loans ----------------
function AdminLoans({ token, notify, onChanged }) {
  const [filter, setFilter] = useState('PENDING');
  const [rows, setRows] = useState(null);
  const [decide, setDecide] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setRows((await api('/admin/loans?status=' + filter, { token })).loans); setError(''); } catch (e) { setError(e.message); }
  }, [token, filter]);
  useEffect(() => { setRows(null); load(); }, [load]);
  return <Panel title="Loan applications" subtitle="Approving disburses the principal into the customer's linked account.">
    <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, v) => v && setFilter(v)} color="primary" sx={{ mb: 2, flexWrap: 'wrap' }}>
      {['PENDING', 'ACTIVE', 'CLOSED', 'REJECTED', 'CANCELLED', 'ALL'].map(s => <ToggleButton key={s} value={s}>{s === 'ALL' ? 'All' : statusLabel(s)}</ToggleButton>)}
    </ToggleButtonGroup>
    {error && <Alert severity="error">{error}</Alert>}
    {!rows ? <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(167,139,250,.1)', borderRadius: 3 }} />
      : rows.length ? <TableContainer><Table>
        <TableHead><TableRow><TableCell>Loan</TableCell><TableCell>Customer</TableCell><TableCell align="right">Amount</TableCell>
          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Terms</TableCell><TableCell>Status</TableCell><TableCell align="right" /></TableRow></TableHead>
        <TableBody>{rows.map(l => <TableRow key={l.id} hover>
          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{l.label}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{l.id} · {time(l.createdAt)}</Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>“{l.purpose}”</Typography></TableCell>
          <TableCell><Typography variant="body2">{l.customerName}</Typography><Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{l.accountNumber}</Typography></TableCell>
          <TableCell align="right">{money(l.principalMinor)}{l.status === 'ACTIVE' && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{money(l.outstandingMinor)} due</Typography>}</TableCell>
          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{l.annualRate}% · {l.termMonths} mo · EMI {money(l.emiMinor)}</TableCell>
          <TableCell><StatusChip status={l.status} /></TableCell>
          <TableCell align="right">{l.status === 'PENDING' && <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="contained" color="success" onClick={() => setDecide({ loan: l, action: 'APPROVE' })}>Approve</Button>
            <Button size="small" variant="outlined" color="error" onClick={() => setDecide({ loan: l, action: 'REJECT' })}>Reject</Button>
          </Stack>}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer> : <Empty title="No loans" text="Nothing in this list right now." />}
    {decide && <NoteDialog open title={decide.action === 'APPROVE' ? 'Approve & disburse loan' : 'Reject loan'}
      description={decide.action === 'APPROVE' ? `${money(decide.loan.principalMinor)} will be credited to ${decide.loan.accountNumber}.` : 'The customer is emailed with your reason.'}
      confirmLabel={decide.action === 'APPROVE' ? 'Approve' : 'Reject'} color={decide.action === 'APPROVE' ? 'success' : 'error'} noteRequired={decide.action === 'REJECT'}
      onClose={() => setDecide(null)}
      onConfirm={async note => { await api(`/admin/loans/${decide.loan.id}/decision`, { token, body: { action: decide.action, note } }); notify('Loan ' + (decide.action === 'APPROVE' ? 'approved and disbursed' : 'rejected')); load(); onChanged(); }} />}
  </Panel>;
}

// ---------------- Banks (common table) ----------------
const emptyBank = { bankName: '', ifsc: '', bankId: '', branch: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', portalUrl: '' };
function Banks({ token, x42Base, notify }) {
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyBank);
  const [remove, setRemove] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const load = useCallback(async () => {
    try { setRows((await api('/banks', { token })).banks); setError(''); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const open = bank => { setForm(bank ? { ...emptyBank, ...Object.fromEntries(Object.keys(emptyBank).map(k => [k, bank[k] || ''])) } : emptyBank); setEdit(bank || 'new'); };
  async function sync() {
    setSyncing(true);
    try {
      const { banks } = await liveApi(x42Base, '/directory/banks');
      const result = await api('/admin/banks/import', { token, body: { banks } });
      notify(`SharedBank directory synced: ${result.added} added, ${result.updated} updated`);
      load();
    } catch (e) { setError(e.message); } finally { setSyncing(false); }
  }
  const q = query.trim().toLowerCase();
  const shown = (rows || []).filter(b => !q || [b.bankName, b.ifsc, b.city, b.bankId].some(v => (v || '').toLowerCase().includes(q)));
  const f = (key, label, props = {}) => <TextField label={label} value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: props.upper ? e.target.value.toUpperCase() : e.target.value }))}
    fullWidth disabled={props.locked} {...props.field} />;

  return <Panel title="Bank management" subtitle="The common bank table: IFSC codes, branches and addresses shared with customers."
    action={<Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <Search value={query} onChange={setQuery} placeholder="Search banks" />
      <Button variant="outlined" startIcon={<SyncRoundedIcon className={syncing ? 'spin' : undefined} />} onClick={sync} disabled={syncing}>Sync network</Button>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => open(null)}>Add bank</Button>
    </Stack>}>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {!rows ? <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(167,139,250,.1)', borderRadius: 3 }} />
      : <TableContainer><Table>
        <TableHead><TableRow><TableCell>Bank</TableCell><TableCell>IFSC</TableCell><TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Branch &amp; address</TableCell>
          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Source</TableCell><TableCell align="right" /></TableRow></TableHead>
        <TableBody>{shown.map(b => <TableRow key={b.ifsc} hover>
          <TableCell><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.bankName}</Typography>
            {b.isOwn && <Chip size="small" color="primary" label="Our bank" />}</Stack>
            {b.bankId && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{b.bankId}</Typography>}</TableCell>
          <TableCell sx={{ fontFamily: 'monospace' }}>{b.ifsc}</TableCell>
          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>{[b.branch, b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ') || '—'}</TableCell>
          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Chip size="small" variant="outlined" label={b.source === 'SHAREDBANK' ? 'SharedBank' : b.source === 'SYSTEM' ? 'System' : 'Manual'} /></TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => open(b)} aria-label="Edit bank"><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
            {!b.isOwn && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setRemove(b)} aria-label="Delete bank"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>}
          </TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
    <ConfirmDialog open={!!edit} title={edit === 'new' ? 'Add a bank' : 'Edit bank'} confirmLabel="Save" onClose={() => setEdit(null)}
      onConfirm={async () => {
        if (edit === 'new') await api('/admin/banks', { token, body: form });
        else await api('/admin/banks/' + edit.ifsc, { token, method: 'PUT', body: form });
        notify('Bank saved'); load();
      }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr', mt: 1 }}>
        <Box sx={{ gridColumn: 'span 2' }}>{f('bankName', 'Bank name')}</Box>
        {f('ifsc', 'IFSC', { upper: true, locked: edit !== 'new' })}
        {f('bankId', 'SharedBank ID', { upper: true })}
        <Box sx={{ gridColumn: 'span 2' }}>{f('branch', 'Branch')}</Box>
        <Box sx={{ gridColumn: 'span 2' }}>{f('address', 'Address', { field: { multiline: true } })}</Box>
        {f('city', 'City')}{f('state', 'State')}{f('pincode', 'PIN code')}{f('phone', 'Phone')}
        <Box sx={{ gridColumn: 'span 2' }}>{f('email', 'Email')}</Box>
        <Box sx={{ gridColumn: 'span 2' }}>{f('portalUrl', 'Portal URL')}</Box>
      </Box>
    </ConfirmDialog>
    <ConfirmDialog open={!!remove} title="Delete bank?" confirmLabel="Delete" color="error" onClose={() => setRemove(null)}
      onConfirm={async () => { await api('/admin/banks/' + remove.ifsc, { token, method: 'DELETE' }); notify('Bank removed'); load(); }}>
      <Typography>{remove?.bankName} · {remove?.ifsc}</Typography>
    </ConfirmDialog>
  </Panel>;
}

// ---------------- Email outbox ----------------
function Outbox({ token }) {
  const [rows, setRows] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/admin/outbox', { token }).then(r => setRows(r.emails)).catch(e => setError(e.message)); }, [token]);
  return <Panel title="Email notifications" subtitle="Every message sent by Nodemailer. Without SMTP settings, emails are kept here only.">
    {error && <Alert severity="error">{error}</Alert>}
    {!rows ? <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(167,139,250,.1)', borderRadius: 3 }} />
      : rows.length ? <Stack spacing={0.5}>{rows.map(m => <Box key={m.id} component="button" type="button" onClick={() => setPreview(m)} sx={{
        all: 'unset', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 2, alignItems: 'center', px: 2, py: 1.4, borderRadius: '14px',
        '&:hover, &:focus-visible': { background: 'rgba(167,139,250,.1)' } }}>
        <Avatar sx={{ bgcolor: 'rgba(167,139,250,.14)', color: 'primary.light', width: 38, height: 38 }}><MailRoundedIcon fontSize="small" /></Avatar>
        <Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontWeight: 600 }}>{m.subject}</Typography>
          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>{m.to} · {time(m.createdAt)}</Typography></Box>
        <Stack alignItems="flex-end" spacing={0.5}><StatusChip status={m.delivery !== 'SMTP' && m.status === 'SENT' ? 'SAVED' : m.status} /><Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.delivery === 'SMTP' ? 'SMTP' : 'Outbox only'}</Typography></Stack>
      </Box>)}</Stack> : <Empty title="No emails yet" text="Decisions on applications and loans send emails." />}
    <Dialog open={!!preview} onClose={() => setPreview(null)} fullWidth maxWidth="sm">
      <DialogTitle sx={serifTitle}>{preview?.subject}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>To {preview?.to} · {time(preview?.createdAt)}{preview?.error ? ' · ' + preview.error : ''}</Typography>
        <Box component="iframe" title="Email preview" sandbox="" srcDoc={preview?.html} sx={{ width: '100%', height: 460, border: 0, borderRadius: 2, background: '#07040f' }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button variant="contained" onClick={() => setPreview(null)}>Close</Button></DialogActions>
    </Dialog>
  </Panel>;
}

// ---------------- Console shell ----------------
export default function AdminConsole({ bank, session, x42Base, switchUrl, onSignOut }) {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const mobile = useMediaQuery(theme => theme.breakpoints.down('md'));
  const token = session.token;

  const loadStats = useCallback(async () => {
    setRefreshing(true);
    try { setStats(await api('/admin/stats', { token })); setError(''); }
    catch (e) { if (e.status === 401) onSignOut('Your session has expired. Sign in again.'); else setError(e.message); }
    finally { setRefreshing(false); }
  }, [token, onSignOut]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const pending = stats?.applications.PENDING || 0;
  const tabs = <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" variant={mobile ? 'scrollable' : 'standard'} scrollButtons="auto" slotProps={tabIndicator}>
    <Tab value="overview" label="Overview" />
    <Tab value="applications" label={<Badge color="warning" badgeContent={pending} sx={{ '& .MuiBadge-badge': { right: -10 } }}>Applications</Badge>} />
    <Tab value="customers" label="Customers" />
    <Tab value="loans" label={<Badge color="warning" badgeContent={stats?.loans.PENDING || 0} sx={{ '& .MuiBadge-badge': { right: -10 } }}>Loans</Badge>} />
    <Tab value="banks" label="Banks" />
    <Tab value="emails" label="Emails" />
  </Tabs>;
  const titles = { overview: 'Mission control', applications: 'Applications', customers: 'Customers', loans: 'Loans', banks: 'Bank directory', emails: 'Notifications' };

  return <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100vh', pb: 8 }}>
    <TopBar bank={bank} email={session.email} subtitle="ADMIN CONSOLE" tabs={tabs} onRefresh={() => { loadStats(); setVersion(v => v + 1); }}
      refreshing={refreshing} onSignOut={() => onSignOut()} switchUrl={switchUrl} />
    <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 } }}>
      <Box className="rise" sx={{ mb: 3 }}>
        <Typography variant="overline" sx={{ color: 'primary.light' }}>Administrator · {bank.name}</Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '2.4rem', md: '3.4rem' } }}>{titles[tab]}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {tab === 'overview' && (stats ? <Stack spacing={3}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          <Stat label="Pending applications" value={stats.applications.PENDING} icon={<HourglassTopRoundedIcon />} tone="#fcd34d" onClick={() => setTab('applications')} />
          <Stat label="On hold" value={stats.applications.ON_HOLD} icon={<PauseCircleRoundedIcon />} tone="#f6b49a" onClick={() => setTab('applications')} />
          <Stat label="Active customers" value={stats.applications.APPROVED} icon={<GroupsRoundedIcon />} tone="#6ee7b7" onClick={() => setTab('customers')} />
          <Stat label="Loan requests" value={stats.loans.PENDING} icon={<RequestQuoteRoundedIcon />} tone="#f0abfc" onClick={() => setTab('loans')} />
          <Stat label="Total deposits" minor={stats.deposits.totalMinor} icon={<SavingsRoundedIcon />} tone="#c4b5fd" />
          <Stat label="Loans outstanding" minor={stats.loans.outstandingMinor} icon={<TrendingDownRoundedIcon />} tone="#a5b4fc" onClick={() => setTab('loans')} />
        </Box>
        <Applications key={'o' + version} token={token} notify={setNote} counts={stats.applications} onChanged={loadStats} />
      </Stack> : <Skeleton variant="rounded" height={240} sx={{ borderRadius: '22px', bgcolor: 'rgba(167,139,250,.1)' }} />)}
      {tab === 'applications' && <Applications key={'a' + version} token={token} notify={setNote} counts={stats?.applications} onChanged={loadStats} />}
      {tab === 'customers' && <Customers key={'c' + version} token={token} notify={setNote} />}
      {tab === 'loans' && <AdminLoans key={'l' + version} token={token} notify={setNote} onChanged={loadStats} />}
      {tab === 'banks' && <Banks key={'b' + version} token={token} x42Base={x42Base} notify={setNote} />}
      {tab === 'emails' && <Outbox key={'e' + version} token={token} />}
    </Container>
    <Snackbar open={!!note} autoHideDuration={6000} onClose={() => setNote('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="success" variant="filled" onClose={() => setNote('')} sx={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff' }}>{note}</Alert>
    </Snackbar>
  </Box>;
}
