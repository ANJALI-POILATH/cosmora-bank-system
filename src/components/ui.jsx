import { useState } from 'react';
import {
  Alert, AppBar, Avatar, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, ListItemIcon, Menu, MenuItem, Stack, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { glass } from '../theme';
import Emblem from './Emblem';

export const serifTitle = { fontFamily: '"Cormorant Garamond", serif', fontSize: 28, fontWeight: 600 };

export function Panel({ title, subtitle, action, children, sx }) {
  return <Box sx={{ ...glass, p: { xs: 2.5, md: 3.5 }, ...sx }} className="rise">
    {(title || action) && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
      <Box>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' } }}>{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>}
    {children}
  </Box>;
}

const statusTone = {
  PENDING: 'warning', ON_HOLD: 'secondary', APPROVED: 'success', REJECTED: 'error', CLOSED: 'default', CANCELLED: 'default',
  ACTIVE: 'success', FROZEN: 'info', COMPLETED: 'success', PROCESSING: 'info', SENT: 'success', SAVED: 'info', FAILED: 'error', NONE: 'default',
};
export const statusLabel = s => ({ ON_HOLD: 'On hold', NONE: 'No application' }[s] || (s ? s.charAt(0) + s.slice(1).toLowerCase().replaceAll('_', ' ') : ''));
export function StatusChip({ status, size = 'small', variant = 'outlined' }) {
  return <Chip size={size} variant={variant} color={statusTone[status] || 'default'} label={statusLabel(status)} />;
}

export function Field({ label, value, mono }) {
  return <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.9 }}>
    <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
    <Typography component="div" variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word', ...(mono && { fontFamily: 'monospace' }) }}>{value || '—'}</Typography>
  </Stack>;
}

export function Empty({ title = 'Nothing here yet', text }) {
  return <Stack alignItems="center" spacing={1.5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
    <Box sx={{ opacity: 0.7 }}><Emblem size={64} /></Box>
    <Typography sx={{ fontWeight: 650, color: 'text.primary' }}>{title}</Typography>
    {text && <Typography variant="body2">{text}</Typography>}
  </Stack>;
}

// Generic dialog for decisions that may need a note (approve / hold / reject...).
export function NoteDialog({ open, title, description, confirmLabel, color = 'primary', noteRequired, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => { if (!busy) { setNote(''); setError(''); onClose(); } };
  async function confirm() {
    if (noteRequired && !note.trim()) { setError('Please add a reason. It is included in the email to the customer.'); return; }
    setBusy(true); setError('');
    try { await onConfirm(note.trim()); setNote(''); onClose(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
    <DialogTitle sx={serifTitle}>{title}</DialogTitle>
    <DialogContent>
      {description && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{description}</Typography>}
      <TextField label={noteRequired ? 'Reason (required)' : 'Note (optional)'} multiline minRows={3} fullWidth value={note}
        onChange={e => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={close} disabled={busy}>Cancel</Button>
      <Button variant="contained" color={color} onClick={confirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
    </DialogActions>
  </Dialog>;
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', color = 'primary', onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="xs">
    <DialogTitle sx={serifTitle}>{title}</DialogTitle>
    <DialogContent>{children}{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant="contained" color={color} onClick={confirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
    </DialogActions>
  </Dialog>;
}

// Sticky top bar shared by the customer dashboard, admin console and status page.
export function TopBar({ bank, email, subtitle, tabs, onRefresh, refreshing, onSignOut, switchUrl, extraMenu }) {
  const [menu, setMenu] = useState(null);
  return <AppBar position="sticky" elevation={0} sx={{ background: 'rgba(10,5,24,.6)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(196,181,253,.1)' }}>
    <Container maxWidth="lg"><Toolbar disableGutters sx={{ gap: 2 }}>
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Emblem size={34} />
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ fontWeight: 750, letterSpacing: '0.22em', fontSize: 13, lineHeight: 1.2 }}>{bank.wordmark}</Typography>
          {subtitle && <Typography sx={{ fontSize: 10, letterSpacing: '0.3em', color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', minWidth: 0 }}>{tabs}</Box>
      <Box sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />
      {onRefresh && <Tooltip title="Refresh"><IconButton onClick={onRefresh} aria-label="Refresh"><RefreshRoundedIcon className={refreshing ? 'spin' : undefined} /></IconButton></Tooltip>}
      <IconButton onClick={e => setMenu(e.currentTarget)} aria-label="Account menu">
        <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', color: '#12082b', fontWeight: 700 }}>
          {(email || '?').charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 650 }}>{email}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{bank.name} · {bank.id}</Typography>
        </Box>
        <Divider />
        {extraMenu?.(() => setMenu(null))}
        {switchUrl && <MenuItem component="a" href={switchUrl}><ListItemIcon><PublicRoundedIcon fontSize="small" /></ListItemIcon>SharedBank switch</MenuItem>}
        <MenuItem onClick={onSignOut}><ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Sign out</MenuItem>
      </Menu>
    </Toolbar></Container>
    {tabs && <Box sx={{ display: { xs: 'block', md: 'none' } }}>{tabs}</Box>}
  </AppBar>;
}

export const tabIndicator = { indicator: { sx: { height: 3, borderRadius: 3, background: 'linear-gradient(90deg,#c4b5fd,#f6b49a)', boxShadow: '0 0 12px #a78bfa' } } };
