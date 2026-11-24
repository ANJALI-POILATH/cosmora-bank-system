import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Collapse, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { api, openDocument } from '../api';
import { time } from '../format';
import { Field, Panel, StatusChip, TopBar } from './ui';
import { FilePicker, indianStates } from './Register';

const look = {
  PENDING: { icon: HourglassTopRoundedIcon, color: '#fcd34d', title: 'Under review', text: 'Our team is reviewing your details and documents. We’ll email you as soon as there’s a decision.' },
  ON_HOLD: { icon: PauseCircleRoundedIcon, color: '#f6b49a', title: 'Action needed', text: 'Your application is on hold. Read the note below, update your details or documents, and resubmit.' },
  REJECTED: { icon: CancelRoundedIcon, color: '#fb7185', title: 'Not approved', text: 'Unfortunately your application was not approved.' },
  APPROVED: { icon: CheckCircleRoundedIcon, color: '#6ee7b7', title: 'Approved', text: 'Your account is ready.' },
  CLOSED: { icon: LockRoundedIcon, color: '#b4a8d8', title: 'Account closed', text: 'This relationship has been closed.' },
  NONE: { icon: HelpRoundedIcon, color: '#b4a8d8', title: 'No application found', text: 'This login has no account application or account with this bank yet.' },
};

const docTypes = [
  { name: 'idProof', type: 'ID_PROOF', label: 'Identity proof', hint: 'Upload a new copy to replace it', required: false },
  { name: 'addressProof', type: 'ADDRESS_PROOF', label: 'Address proof', hint: 'Upload a new copy to replace it', required: false },
  { name: 'photo', type: 'PHOTO', label: 'Photograph', hint: 'Upload a new copy to replace it', required: false },
];

export default function ApplicationStatus({ bank, session, profile: initialProfile, onProfile, onSignOut }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await api('/me', { token: session.token });
      setProfile(next);
      onProfile(next);
    } catch (failure) {
      if (failure.status === 401) onSignOut('Your session has expired. Sign in again.');
      else setError(failure.message);
    } finally { setRefreshing(false); }
  }, [session.token, onProfile, onSignOut]);

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 20_000);
    return () => clearInterval(timer);
  }, [reload]);

  const status = profile.status;
  const view = look[status] || look.NONE;
  const Icon = view.icon;
  const canEdit = ['PENDING', 'ON_HOLD'].includes(status);

  function startEdit() {
    setForm({ phone: profile.phone || '', occupation: profile.occupation || '', addressLine: profile.addressLine || '', city: profile.city || '',
      state: profile.state || '', pincode: profile.pincode || '', note: '' });
    setFiles({}); setError(''); setEditing(true);
  }

  async function resubmit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) data.append(key, value.trim());
    for (const d of docTypes) if (files[d.name]) data.append(d.name, files[d.name]);
    try {
      const next = await api('/applications/me', { token: session.token, form: data, method: 'PUT' });
      setProfile(next); onProfile(next); setEditing(false);
      setSaved('Your application was resubmitted for review.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const holdNote = [...(profile.history || [])].reverse().find(h => h.by === 'admin' && h.note)?.note || profile.reviewNote;
  const field = (key, label, props = {}) => <TextField label={label} value={form[key] ?? ''} fullWidth
    onChange={e => setForm(f => ({ ...f, [key]: props.transform ? props.transform(e.target.value) : e.target.value }))} {...props.field} />;

  return <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100vh', pb: 8 }}>
    <TopBar bank={bank} email={session.email} subtitle="APPLICATION" onRefresh={reload} refreshing={refreshing} onSignOut={() => onSignOut()} />
    <Container maxWidth="md" sx={{ pt: { xs: 3, md: 5 } }}>
      <Box className="rise" sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ width: 96, height: 96, mx: 'auto', borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: `radial-gradient(circle at 35% 30%, ${view.color}55, rgba(20,10,46,.8) 70%)`, boxShadow: `0 0 50px ${view.color}55`, border: `1px solid ${view.color}88` }}>
          <Icon sx={{ fontSize: 48, color: view.color }} />
        </Box>
        <Typography variant="overline" sx={{ color: 'primary.light', display: 'block', mt: 2 }}>Application status</Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '2.4rem', md: '3.2rem' } }}>{view.title}</Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', mt: 1 }}>{view.text}</Typography>
      </Box>

      <Stack spacing={3}>
        {saved && <Alert severity="success" onClose={() => setSaved('')}>{saved}</Alert>}
        {error && !editing && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {['ON_HOLD', 'REJECTED'].includes(status) && holdNote && <Alert severity={status === 'ON_HOLD' ? 'warning' : 'error'}>
          <strong>Note from our team:</strong> {holdNote}</Alert>}

        {status !== 'NONE' && <Panel title="Your application" subtitle={'Submitted ' + time(profile.createdAt)}
          action={canEdit && !editing && <Button variant={status === 'ON_HOLD' ? 'contained' : 'outlined'} onClick={startEdit}>Update &amp; resubmit</Button>}>
          <Collapse in={editing} unmountOnExit>
            <Box component="form" onSubmit={resubmit} sx={{ display: 'grid', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {field('phone', 'Mobile number', { transform: v => v.replace(/\D/g, '').slice(0, 10) })}
                {field('occupation', 'Occupation')}
                <Box sx={{ gridColumn: { sm: 'span 2' } }}>{field('addressLine', 'Address', { field: { multiline: true } })}</Box>
                {field('city', 'City')}
                {field('state', 'State', { field: { select: true, children: indianStates.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>) } })}
                {field('pincode', 'PIN code', { transform: v => v.replace(/\D/g, '').slice(0, 6) })}
              </Box>
              {docTypes.map(doc => <FilePicker key={doc.name} doc={doc} file={files[doc.name]}
                onPick={(file, problem) => { if (file) setFiles(f => ({ ...f, [doc.name]: file })); if (problem) setError(problem); }} />)}
              {field('note', 'Message to the reviewer (optional)', { field: { multiline: true, minRows: 2 } })}
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction="row" spacing={1.5}>
                <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Submitting…' : 'Resubmit for review'}</Button>
                <Button onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
              </Stack>
            </Box>
          </Collapse>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 4 }}>
            <Box>
              <Field label="Status" value={<StatusChip status={status} />} />
              <Field label="Name" value={profile.fullName} />
              <Field label="Email" value={profile.email} />
              <Field label="Mobile" value={profile.phone} />
              <Field label="Address" value={[profile.addressLine, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')} />
            </Box>
            <Box>
              <Field label="PAN" value={profile.pan} mono />
              <Field label="Aadhaar" value={profile.aadhaarMasked} mono />
              <Field label="Initial balance" value={profile.initialDepositMinor ? '₹' + (profile.initialDepositMinor / 100).toLocaleString('en-IN') : '—'} />
              {(profile.documents || []).map(doc => <Field key={doc.id} label={doc.label} value={
                <Button size="small" startIcon={<DescriptionRoundedIcon />} onClick={() => openDocument(session.token, profile.uid, doc.id).catch(e => setError(e.message))}>
                  {doc.name}</Button>} />)}
            </Box>
          </Box>
        </Panel>}

        {(profile.history || []).length > 0 && <Panel title="Timeline">
          <Stack spacing={0}>
            {[...profile.history].reverse().map((item, i) => <Stack key={i} direction="row" spacing={2}>
              <Stack alignItems="center">
                <Box sx={{ width: 12, height: 12, mt: 0.6, borderRadius: '50%', background: i === 0 ? '#c4b5fd' : 'rgba(196,181,253,.35)', boxShadow: i === 0 ? '0 0 10px #a78bfa' : 'none' }} />
                {i < profile.history.length - 1 && <Box sx={{ width: 2, flex: 1, minHeight: 28, background: 'rgba(196,181,253,.2)' }} />}
              </Stack>
              <Box sx={{ pb: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center"><StatusChip status={item.status} /><Typography variant="caption" sx={{ color: 'text.secondary' }}>{time(item.at)}</Typography></Stack>
                {item.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{item.note}</Typography>}
              </Box>
            </Stack>)}
          </Stack>
        </Panel>}

        {status === 'NONE' && <Box sx={{ textAlign: 'center' }}><Button variant="contained" onClick={() => onSignOut()}>Back to the home page</Button></Box>}
      </Stack>
    </Container>
  </Box>;
}
