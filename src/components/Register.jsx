import { useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Container, FormControlLabel, IconButton, InputAdornment, MenuItem, Stack, Step,
  StepLabel, Stepper, TextField, Typography, useMediaQuery,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import { api } from '../api';
import { glass } from '../theme';
import { Field } from './ui';
import Emblem from './Emblem';

export const indianStates = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

const steps = ['Personal details', 'Address', 'KYC documents', 'Account setup', 'Review'];
const fileTypes = ['application/pdf', 'image/png', 'image/jpeg'];
const docs = [
  { name: 'idProof', label: 'Identity proof', hint: 'PAN card, passport or voter ID', required: true },
  { name: 'addressProof', label: 'Address proof', hint: 'Aadhaar, utility bill or rental agreement', required: true },
  { name: 'photo', label: 'Photograph', hint: 'A recent passport-size photo (optional)', required: false },
];

const yearsSince = dob => {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return -1;
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

// Mirrors the server's validation so mistakes show up per step.
function validate(step, f, files) {
  const e = {};
  if (step === 0) {
    if (!/^[\p{L} .'-]{2,}$/u.test(f.fullName.trim())) e.fullName = 'Enter your full name (letters only).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (yearsSince(f.dob) < 18) e.dob = 'You must be at least 18 years old.';
    if (!f.occupation.trim()) e.occupation = 'Enter your occupation.';
  }
  if (step === 1) {
    if (!f.addressLine.trim()) e.addressLine = 'Enter your address.';
    if (!f.city.trim()) e.city = 'Enter your city.';
    if (!f.state) e.state = 'Choose your state.';
    if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'Enter a 6-digit PIN code.';
  }
  if (step === 2) {
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan)) e.pan = 'PAN looks like ABCDE1234F.';
    if (!/^\d{12}$/.test(f.aadhaar)) e.aadhaar = 'Enter all 12 digits.';
    for (const d of docs) if (d.required && !files[d.name]) e[d.name] = 'Upload your ' + d.label.toLowerCase() + '.';
  }
  if (step === 3) {
    const amount = Number(f.initialDeposit);
    if (!/^\d+(\.\d{1,2})?$/.test(f.initialDeposit) || amount < 1000 || amount > 100000) e.initialDeposit = 'Between ₹1,000 and ₹1,00,000.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'At least 8 characters with a letter and a number.';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    if (!f.acceptTerms) e.acceptTerms = 'Please accept the terms.';
  }
  return e;
}

export function FilePicker({ doc, file, error, onPick }) {
  return <Box sx={{ p: 2, borderRadius: '16px', border: '1px dashed', borderColor: error ? 'error.main' : file ? 'success.main' : 'rgba(196,181,253,.35)',
    background: file ? 'rgba(110,231,183,.06)' : 'rgba(10,5,26,.4)', transition: 'all .2s' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 650 }}>{doc.label}{doc.required ? ' *' : ''}</Typography>
        <Typography variant="body2" sx={{ color: error ? 'error.main' : 'text.secondary' }} noWrap>
          {file ? <><InsertDriveFileRoundedIcon sx={{ fontSize: 15, verticalAlign: -3, mr: 0.5 }} />{file.name} · {(file.size / 1024).toFixed(0)} KB</> : error || doc.hint}
        </Typography>
      </Box>
      <Button component="label" variant={file ? 'outlined' : 'contained'} size="small" startIcon={file ? <CheckCircleRoundedIcon /> : <CloudUploadRoundedIcon />}>
        {file ? 'Replace' : 'Upload'}
        <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event => {
          const picked = event.target.files?.[0];
          event.target.value = '';
          if (!picked) return;
          if (!fileTypes.includes(picked.type)) return onPick(null, 'Use a PDF, PNG or JPG file.');
          if (picked.size > 5 * 1024 * 1024) return onPick(null, 'Files must be 5 MB or smaller.');
          onPick(picked);
        }} />
      </Button>
    </Stack>
  </Box>;
}

export default function Register({ bank, onBack }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', dob: '', gender: '', occupation: '', addressLine: '', city: '',
    state: '', pincode: '', pan: '', aadhaar: '', initialDeposit: '1000', password: '', confirm: '', acceptTerms: false });
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState(null);
  const [reveal, setReveal] = useState(false);
  const mobile = useMediaQuery(theme => theme.breakpoints.down('sm'));

  const set = (key, transform = v => v) => event => {
    const value = transform(event.target.type === 'checkbox' ? event.target.checked : event.target.value);
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const input = (key, label, props = {}) => <TextField label={label} value={form[key]} onChange={set(key, props.transform)}
    error={!!errors[key]} helperText={errors[key] || props.helper || ' '} fullWidth {...props.field} />;

  function next() {
    const found = validate(step, form, files);
    setErrors(found);
    if (!Object.keys(found).length) { setStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  async function submit() {
    setBusy(true); setFailure('');
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) if (key !== 'confirm') data.append(key, String(value).trim ? String(value).trim() : value);
    data.set('password', form.password);
    for (const d of docs) if (files[d.name]) data.append(d.name, files[d.name]);
    try {
      await api('/applications', { form: data });
      setDone(form.email.trim());
    } catch (error) { setFailure(error.message); }
    finally { setBusy(false); }
  }

  if (done) return <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, py: { xs: 6, md: 10 } }}>
    <Box sx={{ ...glass, p: { xs: 3, md: 5 }, textAlign: 'center' }} className="rise">
      <MarkEmailReadRoundedIcon sx={{ fontSize: 64, color: 'primary.light', filter: 'drop-shadow(0 0 16px #a78bfa)' }} />
      <Typography variant="h2" sx={{ fontSize: '2.6rem', mt: 2 }}>Application launched</Typography>
      <Typography sx={{ color: 'text.secondary', mt: 1.5, mb: 3 }}>
        We sent a confirmation to <strong>{done}</strong>. Our team will review your documents, and you’ll receive an email when your
        application is approved, put on hold or declined. You can sign in at any time to follow its progress.
      </Typography>
      <Button variant="contained" size="large" onClick={onBack}>Back to sign in</Button>
    </Box>
  </Container>;

  return <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, py: { xs: 3, md: 6 } }}>
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
      <IconButton onClick={onBack} aria-label="Back"><ArrowBackRoundedIcon /></IconButton>
      <Emblem size={36} />
      <Box>
        <Typography variant="overline" sx={{ color: 'primary.light', display: 'block', lineHeight: 1.4 }}>{bank.name}</Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }}>Open your account</Typography>
      </Box>
    </Stack>

    <Box sx={{ ...glass, p: { xs: 2.5, md: 4 } }} className="rise">
      <Stepper activeStep={step} alternativeLabel={!mobile} orientation={mobile ? 'vertical' : 'horizontal'} sx={{ mb: 4,
        '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: 'primary.main', filter: 'drop-shadow(0 0 6px #a78bfa)' } }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {step === 0 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>{input('fullName', 'Full name (as on PAN)', { field: { autoComplete: 'name' } })}</Box>
        {input('email', 'Email', { field: { type: 'email', autoComplete: 'email' } })}
        {input('phone', 'Mobile number', { transform: v => v.replace(/\D/g, '').slice(0, 10),
          field: { slotProps: { input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> }, htmlInput: { inputMode: 'numeric' } } } })}
        {input('dob', 'Date of birth', { field: { type: 'date', slotProps: { inputLabel: { shrink: true } } } })}
        {input('gender', 'Gender', { field: { select: true, children: ['Female', 'Male', 'Other', 'Prefer not to say'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>) } })}
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>{input('occupation', 'Occupation')}</Box>
      </Box>}

      {step === 1 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>{input('addressLine', 'Address', { field: { multiline: true, minRows: 2, autoComplete: 'street-address' } })}</Box>
        {input('city', 'City', { field: { autoComplete: 'address-level2' } })}
        {input('state', 'State', { field: { select: true, children: indianStates.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>) } })}
        {input('pincode', 'PIN code', { transform: v => v.replace(/\D/g, '').slice(0, 6), field: { slotProps: { htmlInput: { inputMode: 'numeric' } } } })}
      </Box>}

      {step === 2 && <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
          {input('pan', 'PAN', { transform: v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), field: { slotProps: { htmlInput: { style: { letterSpacing: '0.15em' } } } } })}
          {input('aadhaar', 'Aadhaar number', { transform: v => v.replace(/\D/g, '').slice(0, 12), helper: 'Only the last 4 digits are stored.',
            field: { slotProps: { htmlInput: { inputMode: 'numeric' } } } })}
        </Box>
        {docs.map(doc => <FilePicker key={doc.name} doc={doc} file={files[doc.name]} error={errors[doc.name]}
          onPick={(file, error) => { if (file) setFiles(f => ({ ...f, [doc.name]: file })); setErrors(e => ({ ...e, [doc.name]: error })); }} />)}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>PDF, PNG or JPG · up to 5 MB each.</Typography>
      </Stack>}

      {step === 3 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
          {input('initialDeposit', 'Initial account balance', { transform: v => v.replace(/[^\d.]/g, ''), helper: 'Minimum ₹1,000. Credited when your account is approved.',
            field: { slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { inputMode: 'decimal' } } } })}
          <Stack direction="row" spacing={1} sx={{ mb: 2, mt: -1, flexWrap: 'wrap', rowGap: 1 }}>
            {['1000', '5000', '10000', '25000'].map(v => <Chip key={v} label={'₹' + Number(v).toLocaleString('en-IN')} variant={form.initialDeposit === v ? 'filled' : 'outlined'}
              color={form.initialDeposit === v ? 'primary' : 'default'} onClick={() => setForm(f => ({ ...f, initialDeposit: v }))} />)}
          </Stack>
        </Box>
        {input('password', 'Create password', { field: { type: reveal ? 'text' : 'password', autoComplete: 'new-password',
          slotProps: { input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setReveal(r => !r)} edge="end" aria-label="Toggle password visibility">
            {reveal ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}</IconButton></InputAdornment> } } } })}
        {input('confirm', 'Confirm password', { field: { type: reveal ? 'text' : 'password', autoComplete: 'new-password' } })}
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
          <FormControlLabel control={<Checkbox checked={form.acceptTerms} onChange={set('acceptTerms')} />}
            label="I confirm these details are accurate and agree to the account terms. I understand this is a test bank with synthetic balances." />
          {errors.acceptTerms && <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>{errors.acceptTerms}</Typography>}
        </Box>
      </Box>}

      {step === 4 && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1, md: 4 } }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.light' }}>Personal</Typography>
          <Field label="Name" value={form.fullName} /><Field label="Email" value={form.email} /><Field label="Mobile" value={'+91 ' + form.phone} />
          <Field label="Date of birth" value={form.dob} /><Field label="Gender" value={form.gender} /><Field label="Occupation" value={form.occupation} />
          <Typography variant="overline" sx={{ color: 'primary.light', mt: 2, display: 'block' }}>Address</Typography>
          <Field label="Address" value={form.addressLine} /><Field label="City / State" value={form.city + ', ' + form.state} /><Field label="PIN" value={form.pincode} />
        </Box>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.light' }}>KYC</Typography>
          <Field label="PAN" value={form.pan} mono /><Field label="Aadhaar" value={'XXXX XXXX ' + form.aadhaar.slice(-4)} mono />
          {docs.map(d => <Field key={d.name} label={d.label} value={files[d.name]?.name || 'Not provided'} />)}
          <Typography variant="overline" sx={{ color: 'primary.light', mt: 2, display: 'block' }}>Account</Typography>
          <Field label="Initial balance" value={'₹' + Number(form.initialDeposit).toLocaleString('en-IN')} />
        </Box>
      </Box>}

      {failure && <Alert severity="error" sx={{ mt: 2 }}>{failure}</Alert>}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
        <Button onClick={() => (step ? setStep(s => s - 1) : onBack())} disabled={busy}>{step ? 'Back' : 'Cancel'}</Button>
        {step < steps.length - 1
          ? <Button variant="contained" onClick={next}>Continue</Button>
          : <Button variant="contained" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</Button>}
      </Stack>
    </Box>
  </Container>;
}
