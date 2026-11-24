import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Skeleton, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import { api } from '../api';
import { money, useCountUp } from '../format';
import { glass } from '../theme';
import { ConfirmDialog, Panel, StatusChip, serifTitle } from './ui';

const palette = ['#c4b5fd', '#f6b49a', '#6ee7b7', '#a5b4fc', '#f0abfc'];

function Metric({ label, minor, icon, tone }) {
  const value = useCountUp(minor);
  return <Box sx={{ ...glass, p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }} className="rise">
    <Avatar sx={{ width: 46, height: 46, bgcolor: 'transparent', border: '1px solid', borderColor: tone, color: tone, boxShadow: `0 0 18px ${tone}55` }}>{icon}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(value)}</Typography>
    </Box>
  </Box>;
}

function NameDialog({ open, title, initial = '', confirmLabel, onClose, onSave }) {
  const [label, setLabel] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setLabel(initial); setError(''); } }, [open, initial]);
  async function save() {
    if (!label.trim()) { setError('Give the account a name.'); return; }
    setBusy(true); setError('');
    try { await onSave(label.trim()); onClose(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="xs">
    <DialogTitle sx={serifTitle}>{title}</DialogTitle>
    <DialogContent>
      <TextField autoFocus fullWidth label="Account name" value={label} onChange={e => setLabel(e.target.value)} sx={{ mt: 1 }}
        slotProps={{ htmlInput: { maxLength: 40 } }} onKeyDown={e => e.key === 'Enter' && save()} />
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
        {['Savings account', 'Salary account', 'Emergency fund', 'Travel fund', 'Goals'].map(s =>
          <Chip key={s} label={s} size="small" variant={label === s ? 'filled' : 'outlined'} color={label === s ? 'primary' : 'default'} onClick={() => setLabel(s)} />)}
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant="contained" onClick={save} disabled={busy}>{busy ? 'Saving…' : confirmLabel}</Button>
    </DialogActions>
  </Dialog>;
}

export default function Portfolio({ token, onChanged, notify }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [closing, setClosing] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api('/portfolio', { token })); setError(''); }
    catch (failure) { setError(failure.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const changed = async message => { await load(); onChanged?.(); notify(message); };

  if (!data) return error ? <Alert severity="error">{error}</Alert>
    : <Skeleton variant="rounded" height={260} sx={{ borderRadius: '22px', bgcolor: 'rgba(167,139,250,.1)' }} />;
  const { accounts, summary } = data;
  const open = accounts.filter(a => a.status !== 'CLOSED');
  const total = open.reduce((s, a) => s + a.postedBalanceMinor, 0);

  return <Stack spacing={3}>
    {error && <Alert severity="error">{error}</Alert>}
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
      <Metric label="Total deposits" minor={summary.totalMinor} icon={<SavingsRoundedIcon />} tone="#c4b5fd" />
      <Metric label="Loans outstanding" minor={summary.outstandingMinor} icon={<RequestQuoteRoundedIcon />} tone="#f6b49a" />
      <Metric label="Net worth" minor={summary.netWorthMinor} icon={<AutoGraphRoundedIcon />} tone="#6ee7b7" />
    </Box>

    <Panel title="Your accounts" subtitle={`${summary.openAccounts} open account${summary.openAccounts === 1 ? '' : 's'} · ${summary.activeLoans} active loan${summary.activeLoans === 1 ? '' : 's'}`}
      action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpening(true)} disabled={summary.openAccounts >= 5}>Open account</Button>}>
      {total > 0 && <Box sx={{ mb: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Allocation</Typography>
        <Box sx={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', mt: 0.5, background: 'rgba(196,181,253,.08)' }}>
          {open.map((a, i) => a.postedBalanceMinor > 0 && <Tooltip key={a.accountId} title={`${a.label}: ${money(a.postedBalanceMinor)} (${Math.round(a.postedBalanceMinor / total * 100)}%)`}>
            <Box sx={{ width: `${a.postedBalanceMinor / total * 100}%`, background: palette[i % palette.length], boxShadow: `0 0 12px ${palette[i % palette.length]}`, transition: 'width .6s ease' }} />
          </Tooltip>)}
        </Box>
      </Box>}
      <Stack spacing={1.5}>
        {accounts.map((a, i) => <Box key={a.accountId} sx={{ p: 2, borderRadius: '18px', border: '1px solid rgba(196,181,253,.14)', background: 'rgba(10,5,26,.35)',
          opacity: a.status === 'CLOSED' ? 0.55 : 1, display: 'grid', gap: 2, alignItems: 'center',
          gridTemplateColumns: { xs: 'auto 1fr', md: 'auto 1.4fr 1fr 1fr auto' }, transition: 'border-color .2s', '&:hover': { borderColor: 'rgba(196,181,253,.4)' } }}>
          <Avatar sx={{ bgcolor: 'transparent', border: `2px solid ${palette[i % palette.length]}`, color: palette[i % palette.length] }}><AccountBalanceRoundedIcon /></Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 650 }}>{a.label}</Typography>
              {a.primary && <Chip size="small" label="Primary" color="primary" />}
              {a.status !== 'ACTIVE' && <StatusChip status={a.status} />}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{a.accountNumber}</Typography>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 2', md: 'auto' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Balance</Typography>
            <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(a.postedBalanceMinor)}</Typography>
            {a.heldMinor > 0 && <Typography variant="caption" sx={{ color: 'warning.main' }}>{money(a.heldMinor)} held</Typography>}
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 2', md: 'auto' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Transfer limits</Typography>
            <Typography variant="body2">{money(a.limits.perTransferMinor)} / transfer</Typography>
            <Typography variant="body2">{money(a.limits.dailyMinor)} / day</Typography>
          </Box>
          {a.status !== 'CLOSED' && <Stack direction="row" spacing={0.5} sx={{ gridColumn: { xs: 'span 2', md: 'auto' }, justifyContent: 'flex-end' }}>
            <Tooltip title="Rename"><IconButton onClick={() => setRenaming(a)} aria-label="Rename account"><EditRoundedIcon /></IconButton></Tooltip>
            {!a.primary && <Tooltip title="Close account"><IconButton onClick={() => setClosing(a)} aria-label="Close account" color="error"><DeleteOutlineRoundedIcon /></IconButton></Tooltip>}
          </Stack>}
        </Box>)}
      </Stack>
    </Panel>

    <NameDialog open={opening} title="Open a new account" initial="Savings account" confirmLabel="Open account" onClose={() => setOpening(false)}
      onSave={async label => { const created = await api('/accounts', { token, body: { label } }); await changed(`Opened ${label} · ${created.accountNumber}`); }} />
    <NameDialog open={!!renaming} title="Rename account" initial={renaming?.label} confirmLabel="Save" onClose={() => setRenaming(null)}
      onSave={async label => { await api('/accounts/' + renaming.accountId, { token, body: { label }, method: 'PATCH' }); await changed('Account renamed'); }} />
    <ConfirmDialog open={!!closing} title="Close this account?" confirmLabel="Close account" color="error" onClose={() => setClosing(null)}
      onConfirm={async () => { await api('/accounts/' + closing.accountId, { token, method: 'DELETE' }); await changed('Account closed'); }}>
      <Typography>{closing?.label} · {closing?.accountNumber}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>The balance must be ₹0. Move any money to another account first.</Typography>
    </ConfirmDialog>
  </Stack>;
}
