import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Collapse, Divider, InputAdornment, LinearProgress, MenuItem, Skeleton, Slider, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { api } from '../api';
import { money, time } from '../format';
import { ConfirmDialog, Empty, Field, Panel, StatusChip } from './ui';

const icons = { PERSONAL: PersonRoundedIcon, EDUCATION: SchoolRoundedIcon, VEHICLE: DirectionsCarRoundedIcon, HOME: HomeRoundedIcon };

// Same reducing-balance formula the server uses.
function emi(principalMinor, rate, months) {
  const r = rate / 12 / 100;
  const f = (1 + r) ** months;
  return Math.ceil((principalMinor * r * f) / (f - 1));
}

function LoanCard({ loan, accounts, token, onChanged }) {
  const [open, setOpen] = useState(false);
  const [pay, setPay] = useState(null);
  const [cancel, setCancel] = useState(false);
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(loan.accountId);
  const Icon = icons[loan.type] || PersonRoundedIcon;
  const progress = loan.totalPayableMinor ? (loan.paidMinor || 0) / loan.totalPayableMinor * 100 : 0;
  const active = accounts.filter(a => a.status === 'ACTIVE');

  return <Box sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(196,181,253,.14)', background: 'rgba(10,5,26,.35)' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
      <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
        background: 'radial-gradient(circle at 35% 30%, rgba(246,180,154,.4), rgba(30,15,70,.6) 70%)', border: '1px solid rgba(246,180,154,.5)' }}>
        <Icon sx={{ color: '#f6b49a' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ fontWeight: 650 }}>{loan.label}</Typography><StatusChip status={loan.status} /></Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{loan.id} · {money(loan.principalMinor)} at {loan.annualRate}% for {loan.termMonths} months</Typography>
      </Box>
      <Box sx={{ textAlign: { sm: 'right' } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{loan.status === 'ACTIVE' ? 'Outstanding' : 'Monthly EMI'}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{money(loan.status === 'ACTIVE' ? loan.outstandingMinor : loan.emiMinor)}</Typography>
      </Box>
    </Stack>
    {['ACTIVE', 'CLOSED'].includes(loan.status) && <Box sx={{ mt: 2 }}>
      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, background: 'rgba(196,181,253,.12)',
        '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#a78bfa,#f6b49a)' } }} />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{money(loan.paidMinor || 0)} of {money(loan.totalPayableMinor)} repaid · {Math.round(progress)}%</Typography>
    </Box>}
    {loan.decisionNote && <Alert severity={loan.status === 'REJECTED' ? 'error' : 'info'} sx={{ mt: 2 }}>{loan.decisionNote}</Alert>}
    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
      {loan.status === 'ACTIVE' && <>
        <Button variant="contained" size="small" onClick={() => { setAmount(''); setPay('emi'); }}>Pay EMI · {money(Math.min(loan.emiMinor, loan.outstandingMinor))}</Button>
        <Button variant="outlined" size="small" onClick={() => { setAmount(''); setPay('custom'); }}>Prepay</Button>
      </>}
      {loan.status === 'PENDING' && <Button variant="outlined" color="error" size="small" onClick={() => setCancel(true)}>Cancel application</Button>}
      <Button size="small" onClick={() => setOpen(o => !o)} endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.2s' }} />}>Details</Button>
    </Stack>
    <Collapse in={open}>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 4 }}>
        <Box>
          <Field label="Applied" value={time(loan.createdAt)} />
          <Field label="Linked account" value={loan.accountNumber} mono />
          <Field label="Purpose" value={loan.purpose} />
          <Field label="Monthly EMI" value={money(loan.emiMinor)} />
          <Field label="Total interest" value={money(loan.totalPayableMinor - loan.principalMinor)} />
        </Box>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Repayments</Typography>
          {loan.repayments?.length ? loan.repayments.slice().reverse().map(r =>
            <Field key={r.reference} label={time(r.at)} value={money(r.amountMinor)} />)
            : <Typography variant="body2" sx={{ color: 'text.secondary' }}>No repayments yet.</Typography>}
        </Box>
      </Box>
    </Collapse>

    <ConfirmDialog open={!!pay} title={pay === 'emi' ? 'Pay this month’s EMI' : 'Prepay your loan'} confirmLabel="Pay now" onClose={() => setPay(null)}
      onConfirm={async () => {
        await api(`/loans/${loan.id}/repay`, { token, body: { accountId: from, ...(pay === 'custom' && { amount }) } });
        onChanged('Payment received for ' + loan.id);
      }}>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField select label="Pay from" value={from} onChange={e => setFrom(e.target.value)}>
          {active.map(a => <MenuItem key={a.accountId} value={a.accountId}>{a.label || a.accountNumber} · {money(a.availableMinor)}</MenuItem>)}
        </TextField>
        {pay === 'custom'
          ? <TextField label="Amount" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            helperText={'Outstanding ' + money(loan.outstandingMinor)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
          : <Typography>Amount: <strong>{money(Math.min(loan.emiMinor, loan.outstandingMinor))}</strong></Typography>}
      </Stack>
    </ConfirmDialog>
    <ConfirmDialog open={cancel} title="Cancel this application?" confirmLabel="Cancel application" color="error" onClose={() => setCancel(false)}
      onConfirm={async () => { await api(`/loans/${loan.id}/cancel`, { token, body: {} }); onChanged('Loan application cancelled'); }}>
      <Typography>{loan.label} for {money(loan.principalMinor)}</Typography>
    </ConfirmDialog>
  </Box>;
}

export default function Loans({ token, accounts, onChanged, notify }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('PERSONAL');
  const [amount, setAmount] = useState(100000);
  const [months, setMonths] = useState(24);
  const [purpose, setPurpose] = useState('');
  const [accountId, setAccountId] = useState('');
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api('/loans', { token })); setError(''); } catch (failure) { setError(failure.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const product = data?.products[type];
  const active = accounts.filter(a => a.status === 'ACTIVE');
  const target = active.some(a => a.accountId === accountId) ? accountId : active[0]?.accountId || '';
  const min = product ? product.minMinor / 100 : 0, max = product ? product.maxMinor / 100 : 0;
  const clamped = Math.min(Math.max(amount, min), max);
  const term = Math.min(Math.max(months, 6), product?.maxMonths || 60);
  const quote = useMemo(() => {
    if (!product) return null;
    const monthly = emi(clamped * 100, product.annualRate, term);
    return { monthly, total: monthly * term, interest: monthly * term - clamped * 100 };
  }, [product, clamped, term]);

  const changed = async message => { await load(); onChanged?.(); notify(message); };

  if (!data) return error ? <Alert severity="error">{error}</Alert>
    : <Skeleton variant="rounded" height={300} sx={{ borderRadius: '22px', bgcolor: 'rgba(167,139,250,.1)' }} />;

  return <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' }, alignItems: 'start' }}>
    <Panel title="Apply for a loan" subtitle="Instant EMI estimate. Approved loans are credited to your account.">
      <Stack spacing={2.5}>
        <ToggleButtonGroup exclusive value={type} onChange={(_, v) => v && setType(v)} color="primary" sx={{ flexWrap: 'wrap' }}>
          {Object.entries(data.products).map(([key, p]) => { const Icon = icons[key]; return <ToggleButton key={key} value={key} sx={{ flex: 1, gap: 0.75 }}>
            <Icon fontSize="small" />{p.label.replace(' loan', '')}</ToggleButton>; })}
        </ToggleButtonGroup>
        <Box>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: 'text.secondary' }}>Amount</Typography>
            <Typography sx={{ fontWeight: 700 }}>₹{clamped.toLocaleString('en-IN')}</Typography></Stack>
          <Slider value={clamped} min={min} max={max} step={min >= 100000 ? 10000 : 5000} onChange={(_, v) => setAmount(v)} aria-label="Loan amount" />
        </Box>
        <Box>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: 'text.secondary' }}>Term</Typography>
            <Typography sx={{ fontWeight: 700 }}>{term} months</Typography></Stack>
          <Slider value={term} min={6} max={product.maxMonths} step={6} onChange={(_, v) => setMonths(v)} aria-label="Loan term" />
        </Box>
        <TextField select label="Credit to account" value={target} onChange={e => setAccountId(e.target.value)} disabled={!active.length}>
          {active.map(a => <MenuItem key={a.accountId} value={a.accountId}>{a.label || 'Account'} · {a.accountNumber}</MenuItem>)}
        </TextField>
        <TextField label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)} multiline slotProps={{ htmlInput: { maxLength: 300 } }} />
        <Box sx={{ p: 2.5, borderRadius: '18px', background: 'linear-gradient(140deg, rgba(124,58,237,.35), rgba(20,10,46,.6))', border: '1px solid rgba(196,181,253,.25)' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Estimated EMI at {product.annualRate}% p.a.</Typography>
          <Typography className="shimmer" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>{money(quote.monthly)}<Typography component="span" sx={{ fontSize: 16, color: 'text.secondary', ml: 1 }}>/ month</Typography></Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total interest {money(quote.interest)}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total {money(quote.total)}</Typography>
          </Stack>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" size="large" disabled={!target || !purpose.trim()} onClick={() => setConfirm(true)}>Apply for {product.label.toLowerCase()}</Button>
      </Stack>
    </Panel>

    <Panel title="Your loans" subtitle="Track approvals, repay EMIs or prepay any time.">
      {data.loans.length ? <Stack spacing={2}>{data.loans.map(loan => <LoanCard key={loan.id} loan={loan} accounts={accounts} token={token} onChanged={changed} />)}</Stack>
        : <Empty title="No loans yet" text="Use the calculator to plan and apply for a loan." />}
    </Panel>

    <ConfirmDialog open={confirm} title="Submit loan application?" confirmLabel="Submit application" onClose={() => setConfirm(false)}
      onConfirm={async () => {
        await api('/loans', { token, body: { type, amount: String(clamped), termMonths: term, purpose: purpose.trim(), accountId: target } });
        setPurpose('');
        await changed('Loan application submitted for review');
      }}>
      <Field label="Loan" value={product.label} />
      <Field label="Amount" value={money(clamped * 100)} />
      <Field label="Term" value={term + ' months'} />
      <Field label="EMI" value={money(quote.monthly)} />
    </ConfirmDialog>
  </Box>;
}
