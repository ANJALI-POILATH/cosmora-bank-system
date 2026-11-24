import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, InputAdornment, Link, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { api, openDocument } from '../api';
import { time } from '../format';
import { ConfirmDialog, Field, Panel, StatusChip } from './ui';
import { indianStates } from './Register';

// Shared bank table (IFSC, branch, address), readable by every customer.
export function BankDirectory({ token }) {
  const [banks, setBanks] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api('/banks', { token }).then(r => setBanks(r.banks)).catch(e => setError(e.message));
  }, [token]);
  const q = query.trim().toLowerCase();
  const shown = banks.filter(b => !q || [b.bankName, b.ifsc, b.city, b.branch].some(v => (v || '').toLowerCase().includes(q)));
  return <Panel title="Bank directory" subtitle="IFSC codes and branch details for banks you can transfer to."
    action={<TextField size="small" placeholder="Search banks" value={query} onChange={e => setQuery(e.target.value)}
      slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />}>
    {error && <Alert severity="error">{error}</Alert>}
    <TableContainer>
      <Table size="small">
        <TableHead><TableRow><TableCell>Bank</TableCell><TableCell>IFSC</TableCell><TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Branch &amp; address</TableCell></TableRow></TableHead>
        <TableBody>{shown.map(b => <TableRow key={b.ifsc} hover>
          <TableCell><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.bankName}</Typography>
            {b.isOwn && <Chip size="small" label="You" color="primary" />}</Stack></TableCell>
          <TableCell sx={{ fontFamily: 'monospace' }}>{b.ifsc}</TableCell>
          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}>
            {[b.branch, b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ') || (b.portalUrl ? <Link href={b.portalUrl} target="_blank" rel="noreferrer">Portal</Link> : '—')}
          </TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  </Panel>;
}

export default function Profile({ token, profile, onProfile, onClosed, notify }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState('');

  const start = useCallback(() => {
    setForm({ phone: profile.phone || '', occupation: profile.occupation || '', addressLine: profile.addressLine || '',
      city: profile.city || '', state: profile.state || '', pincode: profile.pincode || '' });
    setError(''); setEditing(true);
  }, [profile]);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
      onProfile(await api('/profile', { token, body, method: 'PUT' }));
      setEditing(false);
      notify('Profile updated');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const input = (key, label, props = {}) => <TextField label={label} value={form[key] ?? ''} fullWidth
    onChange={e => setForm(f => ({ ...f, [key]: props.transform ? props.transform(e.target.value) : e.target.value }))} {...props.field} />;

  return <Stack spacing={3}>
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, alignItems: 'start' }}>
      <Panel title="Personal details" subtitle={profile.legacy ? 'Linked from your existing X42 account.' : 'Name, PAN and date of birth are verified and cannot be changed here.'}
        action={!editing && <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={start}>Edit</Button>}>
        {editing ? <Box component="form" onSubmit={save} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {input('phone', 'Mobile number', { transform: v => v.replace(/\D/g, '').slice(0, 10) })}
          {input('occupation', 'Occupation')}
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>{input('addressLine', 'Address', { field: { multiline: true } })}</Box>
          {input('city', 'City')}
          {input('state', 'State', { field: { select: true, children: indianStates.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>) } })}
          {input('pincode', 'PIN code', { transform: v => v.replace(/\D/g, '').slice(0, 6) })}
          {error && <Alert severity="error" sx={{ gridColumn: { sm: 'span 2' } }}>{error}</Alert>}
          <Stack direction="row" spacing={1.5} sx={{ gridColumn: { sm: 'span 2' } }}>
            <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
            <Button onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
          </Stack>
        </Box> : <Box>
          <Field label="Name" value={profile.fullName} />
          <Field label="Email" value={profile.email} />
          <Field label="Mobile" value={profile.phone && '+91 ' + profile.phone} />
          <Field label="Date of birth" value={profile.dob} />
          <Field label="Occupation" value={profile.occupation} />
          <Field label="Address" value={[profile.addressLine, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')} />
        </Box>}
      </Panel>
      <Stack spacing={3}>
        <Panel title="KYC">
          <Field label="Status" value={<StatusChip status={profile.status} />} />
          <Field label="Customer since" value={time(profile.reviewedAt || profile.createdAt)} />
          <Field label="Primary account" value={profile.accountNumber} mono />
          <Field label="PAN" value={profile.pan} mono />
          <Field label="Aadhaar" value={profile.aadhaarMasked} mono />
          {(profile.documents || []).map(doc => <Field key={doc.id} label={doc.label} value={
            <Button size="small" startIcon={<DescriptionRoundedIcon />} onClick={() => openDocument(token, profile.uid, doc.id).catch(e => setError(e.message))}>View</Button>} />)}
        </Panel>
        <Panel title="Close relationship" subtitle="Closes all your accounts and disables your login.">
          <Button variant="outlined" color="error" onClick={() => setClosing(true)}>Close my accounts</Button>
        </Panel>
      </Stack>
    </Box>

    <ConfirmDialog open={closing} title="Close your relationship?" confirmLabel="Close everything" color="error" onClose={() => setClosing(false)}
      onConfirm={async () => { await api('/profile', { token, method: 'DELETE', body: { reason } }); onClosed(); }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        All your accounts will be closed and you will be signed out. Loans must be fully repaid first. This cannot be undone from the portal.
      </Typography>
      <TextField label="Reason (optional)" fullWidth multiline value={reason} onChange={e => setReason(e.target.value)} />
    </ConfirmDialog>
  </Stack>;
}
