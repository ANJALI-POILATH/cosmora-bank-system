import { useMemo, useRef, useState } from 'react';
import {
  Alert, AppBar, Avatar, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, InputAdornment, LinearProgress, ListItemIcon, Menu, MenuItem, Skeleton, Snackbar, Stack, Tab, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Toolbar, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LanRoundedIcon from '@mui/icons-material/LanRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { toPaise } from '../amount';
import { byId, money, reason, statusColor, statusNames, time, useCountUp } from '../format';
import { glass } from '../theme';
import Emblem from './Emblem';
import Portfolio from './Portfolio';
import Loans from './Loans';
import Profile, { BankDirectory } from './Profile';

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};
const isIncoming = row => row.direction === 'CREDIT';

function Panel({ title, subtitle, action, children, sx }) {
  return <Box sx={{ ...glass, p: { xs: 2.5, md: 3.5 }, ...sx }} className="rise">
    {(title || action) && <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
      <Box>
        <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' } }}>{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Stack>}
    {children}
  </Box>;
}

function Stat({ label, minor, icon, tone }) {
  const value = useCountUp(minor);
  return <Box sx={{ ...glass, p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }} className="rise">
    <Avatar sx={{ width: 46, height: 46, bgcolor: 'transparent', border: '1px solid', borderColor: tone, color: tone, boxShadow: `0 0 18px ${tone}55` }}>{icon}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(value)}</Typography>
    </Box>
  </Box>;
}

function AccountCard({ account, index, onCopy }) {
  const ref = useRef(null);
  const available = useCountUp(account.availableMinor);
  const tilt = event => {
    const box = ref.current.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const reset = () => { ref.current.style.transform = ''; };
  const primary = index === 0;

  return <Box ref={ref} onMouseMove={tilt} onMouseLeave={reset} className="rise" sx={{
    ...glass, position: 'relative', overflow: 'hidden', p: 3, minHeight: 200, display: 'flex', flexDirection: 'column',
    transition: 'transform .25s ease, box-shadow .3s ease', animationDelay: `${index * 80}ms`,
    background: primary
      ? 'linear-gradient(140deg, rgba(124,58,237,.75), rgba(49,22,110,.85) 55%, rgba(20,10,46,.9))'
      : glass.background,
    '&::before': {
      content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(400px circle at var(--gx, 30%) var(--gy, 20%), rgba(255,255,255,.14), transparent 45%)',
    },
    '&:hover': { boxShadow: '0 30px 80px rgba(76,29,149,.55), 0 0 0 1px rgba(196,181,253,.35)' },
  }}>
    <div className={'planet ' + (primary ? 'peach' : 'violet')} style={{ width: 120, height: 120, right: -34, top: -34, opacity: 0.85 }} />
    <Stack direction="row" alignItems="center" spacing={1} sx={{ position: 'relative' }}>
      <Typography sx={{ fontFamily: 'monospace', letterSpacing: '0.18em', fontSize: 15 }}>{account.accountNumber}</Typography>
      <Tooltip title="Copy account number">
        <IconButton size="small" onClick={() => onCopy(account.accountNumber)} aria-label="Copy account number"><ContentCopyRoundedIcon fontSize="inherit" /></IconButton>
      </Tooltip>
    </Stack>
    <Box sx={{ flex: 1 }} />
    <Typography variant="overline" sx={{ color: 'rgba(239,233,255,.7)', position: 'relative' }}>Available balance</Typography>
    <Typography sx={{ fontSize: { xs: 30, md: 36 }, fontWeight: 750, fontVariantNumeric: 'tabular-nums', position: 'relative', lineHeight: 1.1 }}>{money(available)}</Typography>
    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, color: 'rgba(239,233,255,.7)', fontSize: 13, position: 'relative' }}>
      <span>Held {money(account.heldMinor)}</span>
      <span>{account.accountId}{account.status && account.status !== 'ACTIVE' ? ' · ' + account.status.toLowerCase() : ''}</span>
    </Stack>
  </Box>;
}

function TransferRow({ row, directory, onOpen, compact }) {
  const incoming = isIncoming(row);
  const internal = row.type === 'INTERNAL';
  const Icon = internal ? SyncAltRoundedIcon : incoming ? SouthWestRoundedIcon : NorthEastRoundedIcon;
  return <Box component="button" type="button" onClick={() => onOpen(row)} sx={{
    all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'grid', alignItems: 'center', gap: 2,
    gridTemplateColumns: compact ? 'auto 1fr auto' : { xs: 'auto 1fr auto', md: 'auto 1.4fr 1.4fr auto 130px' },
    px: 2, py: 1.6, borderRadius: '16px', transition: 'background .2s ease',
    '&:hover, &:focus-visible': { background: 'rgba(167,139,250,.1)' },
  }}>
    <Avatar sx={{ width: 40, height: 40, bgcolor: incoming ? 'rgba(110,231,183,.12)' : 'rgba(167,139,250,.14)', color: incoming ? 'success.main' : 'primary.light' }}>
      <Icon fontSize="small" />
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontWeight: 600 }}>{byId(directory, row.sourceBankId)} → {byId(directory, row.destinationBankId)}</Typography>
      <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
        {internal ? 'Same bank' : incoming ? 'Incoming' : 'Outgoing'} · {time(row.createdAt)}
      </Typography>
    </Box>
    {!compact && <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontFamily: 'monospace', display: { xs: 'none', md: 'block' } }}>{row.transferId}</Typography>}
    {!compact && <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <Chip size="small" variant="outlined" color={statusColor[row.status] || 'default'} label={statusNames[row.status] || row.status} />
    </Box>}
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: incoming ? 'success.main' : 'text.primary' }}>
        {incoming ? '+' : '−'}{money(row.amountMinor)}
      </Typography>
      <Typography variant="caption" sx={{ color: statusColor[row.status] ? `${statusColor[row.status]}.main` : 'text.secondary', display: compact ? 'block' : { md: 'none' } }}>
        {statusNames[row.status] || row.status}
      </Typography>
    </Box>
  </Box>;
}

function TransferDetail({ row, directory, onClose }) {
  return <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
    {row && <>
      <DialogTitle sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, fontWeight: 600 }}>Transfer details</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 34, fontWeight: 750, color: isIncoming(row) ? 'success.main' : 'text.primary' }}>
          {isIncoming(row) ? '+' : '−'}{money(row.amountMinor)}
        </Typography>
        <Chip sx={{ mt: 1, mb: 2 }} size="small" color={statusColor[row.status] || 'default'} label={statusNames[row.status] || row.status} />
        {row.code && <Alert severity="warning" sx={{ mb: 2 }}>{reason(row.code)}</Alert>}
        <Stack divider={<Divider flexItem />} spacing={1.2}>
          {[
            ['Transfer ID', row.transferId],
            ['From bank', byId(directory, row.sourceBankId)],
            ['To bank', byId(directory, row.destinationBankId)],
            ['Type', row.type === 'INTERNAL' ? 'Same bank' : 'Interbank'],
            ['Direction', isIncoming(row) ? 'Incoming' : 'Outgoing'],
            ['Created', time(row.createdAt)],
          ].map(([label, value]) => <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{value}</Typography>
          </Stack>)}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => navigator.clipboard?.writeText(row.transferId)} startIcon={<ContentCopyRoundedIcon />}>Copy ID</Button>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </>}
  </Dialog>;
}

function TransferForm({ bank, accounts, directory, send }) {
  const [type, setType] = useState('interbank');
  const [from, setFrom] = useState('');
  const [destination, setDestination] = useState('');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('200');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const sources = accounts.filter(account => account.status === 'ACTIVE');
  const fromId = sources.some(item => item.accountId === from) ? from : (sources[0]?.accountId || '');
  const source = sources.find(item => item.accountId === fromId);
  const routes = directory.filter(item => item.bankId !== bank.id && item.status === 'ACTIVE');
  const route = destination ? (routes.find(item => item.ifsc === destination)?.ifsc || '') : (routes[0]?.ifsc || '');
  const target = type === 'internal' ? bank.ifsc : route;
  const targetName = type === 'internal' ? bank.name : (routes.find(item => item.ifsc === route)?.bankName || '—');
  const amountMinor = toPaise(amount);
  const overBalance = source && amountMinor !== null && amountMinor > source.availableMinor;

  function review(event) {
    event.preventDefault();
    setError('');
    if (!fromId || !target || !number.trim() || amountMinor === null) {
      setError('Choose a source, destination and positive amount with at most two decimal places.');
      return;
    }
    setConfirm({ fromAccountId: fromId, destinationIfsc: target,
      destinationAccountNumber: number.trim(), amountMinor, currency: 'INR' });
  }

  async function submit() {
    const transfer = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      await send(transfer);
      setNumber('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.35fr 1fr' }, gap: 3 }}>
    <Panel title="Send a transfer" subtitle="Transfers use synthetic balances stored in Firestore.">
      {busy && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}
      <Box component="form" onSubmit={review} sx={{ display: 'grid', gap: 2.2 }}>
        <ToggleButtonGroup exclusive fullWidth value={type} onChange={(_, value) => value && setType(value)} disabled={busy} color="primary">
          <ToggleButton value="interbank"><PublicRoundedIcon fontSize="small" sx={{ mr: 1 }} />Interbank</ToggleButton>
          <ToggleButton value="internal"><SyncAltRoundedIcon fontSize="small" sx={{ mr: 1 }} />Same bank</ToggleButton>
        </ToggleButtonGroup>
        <TextField select label="From account" required value={fromId} onChange={e => setFrom(e.target.value)} disabled={busy || !sources.length}>
          {sources.map(account => <MenuItem key={account.accountId} value={account.accountId}>
            {account.accountNumber} · {money(account.availableMinor)} available
          </MenuItem>)}
        </TextField>
        {type === 'interbank' && <TextField select label="Destination bank" required value={route}
          onChange={e => setDestination(e.target.value)} disabled={busy || !routes.length}
          helperText={!routes.length ? 'Loading the bank directory…' : undefined}>
          {routes.map(item => <MenuItem key={item.ifsc} value={item.ifsc}>{item.bankName} · {item.ifsc}</MenuItem>)}
        </TextField>}
        <TextField label="Destination account number" required value={number} onChange={e => setNumber(e.target.value)} disabled={busy}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', letterSpacing: '0.1em' } } }} />
        <TextField label="Amount" required value={amount} onChange={e => setAmount(e.target.value)} disabled={busy}
          error={amount !== '' && amountMinor === null}
          helperText={amount !== '' && amountMinor === null ? 'Enter a positive amount with up to two decimals.' : overBalance ? 'This is more than the available balance.' : ' '}
          slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mt: -1 }}>
          {['1', '100', '500', '1000', '5000'].map(value => <Chip key={value} label={'₹' + Number(value).toLocaleString('en-IN')}
            onClick={() => setAmount(value)} color={amount === value ? 'primary' : 'default'} variant={amount === value ? 'filled' : 'outlined'} disabled={busy} />)}
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <Box><Button type="submit" variant="contained" size="large" disabled={busy || !fromId || !target} startIcon={<SendRoundedIcon />}>
          {busy ? 'Submitting…' : 'Review transfer'}
        </Button></Box>
      </Box>
    </Panel>

    <Panel title="Flight path" subtitle="A preview of where your money travels.">
      <Stack spacing={2.5} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
        <Box><Typography variant="overline" sx={{ color: 'text.secondary' }}>From</Typography>
          <Typography sx={{ fontWeight: 650 }}>{bank.name}</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{source?.accountNumber || '—'}</Typography></Box>
        <Box sx={{ position: 'relative', width: 2, height: 70, background: 'linear-gradient(#c4b5fd, #f6b49a)', borderRadius: 2 }}>
          <RocketLaunchRoundedIcon sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) rotate(135deg)', color: '#f6b49a', fontSize: 26, filter: 'drop-shadow(0 0 8px #f6b49a)' }} />
        </Box>
        <Box><Typography variant="overline" sx={{ color: 'text.secondary' }}>To</Typography>
          <Typography sx={{ fontWeight: 650 }}>{targetName}</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{number.trim() || 'Account number'} · {target || '—'}</Typography></Box>
        <Divider flexItem />
        <Typography className="shimmer" sx={{ fontSize: 40, fontWeight: 750, fontFamily: '"Cormorant Garamond", serif' }}>
          {amountMinor !== null ? money(amountMinor) : '₹—'}
        </Typography>
      </Stack>
    </Panel>

    <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, fontWeight: 600 }}>Confirm transfer</DialogTitle>
      <DialogContent>
        {confirm && <Stack spacing={1.2}>
          <Typography sx={{ fontSize: 34, fontWeight: 750 }}>{money(confirm.amountMinor)}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>From {source?.accountNumber}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>To {confirm.destinationAccountNumber} at {targetName} ({confirm.destinationIfsc})</Typography>
          {overBalance && <Alert severity="warning">This exceeds the available balance and may be rejected.</Alert>}
        </Stack>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => setConfirm(null)}>Cancel</Button>
        <Button variant="contained" onClick={submit} startIcon={<SendRoundedIcon />}>Send now</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}

function Activity({ rows, directory, onOpen }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const shown = rows.filter(row => {
    if (filter === 'incoming' && (!isIncoming(row) || row.type === 'INTERNAL')) return false;
    if (filter === 'outgoing' && (isIncoming(row) || row.type === 'INTERNAL')) return false;
    if (filter === 'internal' && row.type !== 'INTERNAL') return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [row.transferId, byId(directory, row.sourceBankId), byId(directory, row.destinationBankId), statusNames[row.status]]
      .some(value => String(value || '').toLowerCase().includes(q));
  });

  return <Panel title="Transfer activity" subtitle="Latest 50 transfers for this user. Select one for details.">
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, value) => value && setFilter(value)} color="primary"
        sx={{ flexWrap: 'wrap' }}>
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="incoming">Incoming</ToggleButton>
        <ToggleButton value="outgoing">Outgoing</ToggleButton>
        <ToggleButton value="internal">Same bank</ToggleButton>
      </ToggleButtonGroup>
      <TextField size="small" placeholder="Search by ID, bank or status" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
    </Stack>
    {shown.length ? <Stack spacing={0.5}>{shown.map(row => <TransferRow key={row.transferId} row={row} directory={directory} onOpen={onOpen} />)}</Stack>
      : <Empty text={rows.length ? 'No transfers match this filter.' : 'Your transfers appear here when the Worker accepts them.'} />}
  </Panel>;
}

function Empty({ text }) {
  return <Stack alignItems="center" spacing={1.5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
    <Box sx={{ opacity: 0.7 }}><Emblem size={70} /></Box>
    <Typography sx={{ fontWeight: 650, color: 'text.primary' }}>No transfers yet</Typography>
    <Typography variant="body2">{text}</Typography>
  </Stack>;
}

export default function Dashboard({
  bank, switchUrl, session, data, loaded, error, note, clearNote,
  refresh, refreshing, logout, send, canEditConnection, openConnection, profile, onProfile, onClosed, mode, directory: networkDirectory,
}) {
  // Always know our own bank's name, even when the network directory is unavailable.
  const directory = useMemo(() => networkDirectory.some(b => b.bankId === bank.id) ? networkDirectory
    : [...networkDirectory, { bankId: bank.id, bankName: bank.name, ifsc: bank.ifsc, status: 'ACTIVE' }], [networkDirectory, bank]);
  const [tab, setTab] = useState('overview');
  const [menu, setMenu] = useState(null);
  const [detail, setDetail] = useState(null);
  const [copied, setCopied] = useState('');
  const mobile = useMediaQuery(theme => theme.breakpoints.down('md'));

  const totals = useMemo(() => {
    const done = data.transfers.filter(row => row.status === 'COMPLETED' && row.type !== 'INTERNAL');
    return {
      available: data.accounts.reduce((sum, account) => sum + (account.availableMinor || 0), 0),
      received: done.filter(isIncoming).reduce((sum, row) => sum + row.amountMinor, 0),
      sent: done.filter(row => !isIncoming(row)).reduce((sum, row) => sum + row.amountMinor, 0),
    };
  }, [data]);

  const copy = text => {
    navigator.clipboard?.writeText(text).then(() => setCopied('Account number copied'), () => setCopied('Copy failed'));
  };
  const sendAndShow = async transfer => { await send(transfer); setTab('activity'); };
  const name = (profile?.fullName || session.email.split('@')[0]).split(' ')[0];
  const titles = { overview: 'Your constellation', send: 'Launch a transfer', activity: 'Mission log', portfolio: 'Your portfolio', loans: 'Loans', profile: 'Your profile' };
  const tabs = <Tabs value={tab} onChange={(_, value) => setTab(value)} textColor="inherit"
    variant={mobile ? 'scrollable' : 'standard'} scrollButtons="auto"
    slotProps={{ indicator: { sx: { height: 3, borderRadius: 3, background: 'linear-gradient(90deg,#c4b5fd,#f6b49a)', boxShadow: '0 0 12px #a78bfa' } } }}>
    <Tab value="overview" label="Overview" />
    <Tab value="send" label="Send" />
    <Tab value="activity" label="Activity" />
    <Tab value="portfolio" label="Portfolio" />
    <Tab value="loans" label="Loans" />
    <Tab value="profile" label="Profile" />
  </Tabs>;

  return <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100vh', pb: 8 }}>
    <AppBar position="sticky" elevation={0} sx={{ background: 'rgba(10,5,24,.6)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(196,181,253,.1)' }}>
      <Container maxWidth="lg"><Toolbar disableGutters sx={{ gap: 2 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Emblem size={34} />
          <Typography sx={{ fontWeight: 750, letterSpacing: '0.22em', fontSize: 13, display: { xs: 'none', sm: 'block' } }}>{bank.wordmark}</Typography>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{!mobile && tabs}</Box>
        <Tooltip title="Refresh balances">
          <IconButton onClick={() => refresh()} aria-label="Refresh balances"><RefreshRoundedIcon className={refreshing ? 'spin' : undefined} /></IconButton>
        </Tooltip>
        <IconButton onClick={e => setMenu(e.currentTarget)} aria-label="Account menu">
          <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', color: '#12082b', fontWeight: 700 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography sx={{ fontWeight: 650 }}>{session.email}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{bank.name} · {bank.id}</Typography>
          </Box>
          <Divider />
          <MenuItem component="a" href={switchUrl}><ListItemIcon><PublicRoundedIcon fontSize="small" /></ListItemIcon>SharedBank switch</MenuItem>
          {canEditConnection && <MenuItem onClick={() => { setMenu(null); openConnection(); }}><ListItemIcon><LanRoundedIcon fontSize="small" /></ListItemIcon>Worker connection</MenuItem>}
          <MenuItem onClick={logout}><ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Sign out</MenuItem>
        </Menu>
      </Toolbar></Container>
      {mobile && tabs}
    </AppBar>

    <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 } }}>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={2} sx={{ mb: 3 }} className="rise">
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.light' }}>{greeting()}, {name}</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '2.4rem', md: '3.4rem' } }}>
            {titles[tab]}
          </Typography>
        </Box>
        <Chip size="small" variant="outlined" color="primary" label={mode === 'local' ? 'Local demo mode' : 'Firestore test network'} sx={{ display: { xs: 'none', sm: 'flex' } }} />
      </Stack>

      <Stack spacing={2} sx={{ mb: error ? 3 : 0 }}>{error && <Alert severity="error">{error}</Alert>}</Stack>

      {!loaded && ['overview', 'send', 'activity'].includes(tab) && <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {[0, 1].map(i => <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: '22px', bgcolor: 'rgba(167,139,250,.1)' }} />)}
      </Box>}
      {loaded && !data.accounts.length && ['overview', 'send'].includes(tab) && <Alert severity="info" sx={{ mb: 3 }}>This Firebase user has no synthetic account in this bank. Attach an account to this Firebase UID.</Alert>}

      {loaded && tab === 'overview' && <Stack spacing={3}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          <Stat label="Total available" minor={totals.available} icon={<AccountBalanceWalletRoundedIcon />} tone="#c4b5fd" />
          <Stat label="Received" minor={totals.received} icon={<SouthWestRoundedIcon />} tone="#6ee7b7" />
          <Stat label="Sent" minor={totals.sent} icon={<NorthEastRoundedIcon />} tone="#f6b49a" />
        </Box>
        {data.accounts.length > 0 && <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: data.accounts.length > 1 ? '1fr 1fr' : '1fr' } }}>
          {data.accounts.map((account, i) => <AccountCard key={account.accountId} account={account} index={i} onCopy={copy} />)}
        </Box>}
        <Panel title="Recent activity" subtitle="Your five latest transfers."
          action={<Stack direction="row" spacing={1}>
            {data.accounts.length > 0 && <Button variant="contained" size="small" startIcon={<SendRoundedIcon />} onClick={() => setTab('send')}>Send</Button>}
            <Button variant="outlined" size="small" onClick={() => setTab('activity')}>View all</Button>
          </Stack>}>
          {data.transfers.length
            ? <Stack spacing={0.5}>{data.transfers.slice(0, 5).map(row => <TransferRow key={row.transferId} row={row} directory={directory} onOpen={setDetail} compact />)}</Stack>
            : <Empty text="Send your first transfer to see it light up here." />}
        </Panel>
      </Stack>}

      {loaded && tab === 'send' && <Stack spacing={3}>
        {data.accounts.length
          ? <TransferForm bank={bank} accounts={data.accounts} directory={directory} send={sendAndShow} />
          : <Alert severity="info">You need an active account to send transfers.</Alert>}
        <BankDirectory token={session.token} />
      </Stack>}

      {loaded && tab === 'activity' && <Activity rows={data.transfers} directory={directory} onOpen={setDetail} />}
      {tab === 'portfolio' && <Portfolio token={session.token} onChanged={() => refresh()} notify={setCopied} />}
      {tab === 'loans' && <Loans token={session.token} accounts={data.accounts} onChanged={() => refresh()} notify={setCopied} />}
      {tab === 'profile' && profile && <Profile token={session.token} profile={profile} onProfile={onProfile} onClosed={onClosed} notify={setCopied} />}
    </Container>

    <TransferDetail row={detail} directory={directory} onClose={() => setDetail(null)} />
    <Snackbar open={!!note} autoHideDuration={6000} onClose={clearNote} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={note.startsWith('Rejected') ? 'warning' : 'success'} variant="filled" onClose={clearNote} icon={<AutoAwesomeRoundedIcon />}
        sx={{ background: note.startsWith('Rejected') ? undefined : 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff' }}>{note}</Alert>
    </Snackbar>
    <Snackbar open={!!copied} autoHideDuration={2500} onClose={() => setCopied('')} message={copied} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
  </Box>;
}
