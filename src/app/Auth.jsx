import { useState } from 'react';
import { Alert, Button, MenuItem, Step, StepLabel, Stepper, TextField } from '@mui/material';
import { ArrowLeft, FileUp, KeyRound, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { toPaise } from '../amount';
import { MIN_OPENING_MINOR, portal, usePortal } from './store';
import { GlassCard, Logo, Pill, money, time } from './ui';

function Shell({ go, children, aside }) {
  return <div className="cz-auth">
    <div className="cz-stars" aria-hidden="true" />
    <header className="cz-nav"><Logo onClick={() => go('landing')} />
      <button type="button" className="cz-link" onClick={() => go('landing')}><ArrowLeft size={15} /> Back to home</button></header>
    <div className="cz-auth-grid">
      <div className="cz-auth-art" aria-hidden="true">{aside}</div>
      <div className="cz-auth-box">{children}</div>
    </div>
  </div>;
}

export function Login({ go, signIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await signIn(email, password); }
    catch (failure) { setError(failure.message); setPassword(''); }
    finally { setBusy(false); }
  }

  return <Shell go={go} aside={<>
    <div className="cz-orb small" />
    <GlassCard className="cz-auth-card" number="P625 •••• ••••" holder="WELCOME BACK" />
    <h2>Good to see you again.</h2><p>Sign in to check balances, send money and manage loans.</p>
  </>}>
    <h1>Sign in</h1>
    <p className="cz-muted">Customers and the bank admin use the same sign-in.</p>
    <form className="cz-form" onSubmit={submit}>
      <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={busy} startIcon={<KeyRound size={17} />}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
    <p className="cz-switch">New to Cosmora? <button type="button" onClick={() => go('register')}>Open an account</button>
      {' · '}<button type="button" onClick={() => go('status')}>Track an application</button></p>
  </Shell>;
}

const blank = { name: '', email: '', phone: '', dob: '', address: '', idType: 'PAN', idNumber: '', opening: '1000', documents: [] };

export function Register({ go }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const field = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  function validate() {
    if (step === 0) {
      if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || !/^\d{10}$/.test(form.phone) || !form.dob || !form.address.trim())
        return 'Fill in every field. The phone number needs 10 digits.';
    }
    if (step === 1) {
      if (!form.idNumber.trim()) return 'Enter your ID number.';
      if (!form.documents.length) return 'Upload at least one identity or address proof.';
    }
    if (step === 2) {
      const minor = toPaise(form.opening);
      if (minor === null || minor < MIN_OPENING_MINOR) return 'The opening balance must be at least ₹1,000.';
    }
    return '';
  }

  function next(event) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (step < 2) { setStep(step + 1); return; }
    try {
      const { opening, ...rest } = form;
      setDone(portal.register({ ...rest, name: rest.name.trim(), openingMinor: toPaise(opening) }));
    } catch (failure) { setError(failure.message); }
  }

  function addFiles(list) {
    const docs = Array.from(list).filter(f => f.size <= 5 * 1024 * 1024).map(f => ({ name: f.name, size: f.size, type: f.type }));
    if (docs.length < list.length) setError('Files larger than 5 MB were skipped.');
    setForm(f => ({ ...f, documents: [...f.documents, ...docs] }));
  }

  const aside = <>
    <div className="cz-orb small" />
    <GlassCard className="cz-auth-card" variant="coral" number="P625 •••• ••••" holder={form.name.toUpperCase() || 'YOUR NAME HERE'} label="New account" />
    <h2>Open your account in three steps.</h2><p>Our team reviews every application and emails you the decision.</p>
  </>;

  if (done) return <Shell go={go} aside={aside}>
    <div className="cz-success"><ShieldCheck size={38} />
      <h1>Application submitted</h1>
      <p className="cz-muted">Your application ID is <strong>{done.id}</strong>. We have emailed {done.email}, and we will email you again when the review is complete.</p>
      <div className="cz-row"><Button variant="contained" onClick={() => go('status')}>Track status</Button>
        <Button variant="outlined" onClick={() => go('landing')}>Back to home</Button></div>
    </div>
  </Shell>;

  return <Shell go={go} aside={aside}>
    <h1>Open an account</h1>
    <p className="cz-muted">The minimum opening balance is ₹1,000.</p>
    <Stepper activeStep={step} alternativeLabel className="cz-stepper">
      {['Personal details', 'Documents', 'Opening balance'].map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
    </Stepper>
    <form className="cz-form" onSubmit={next} noValidate>
      {step === 0 && <>
        <TextField label="Full name" required {...field('name')} />
        <div className="cz-two">
          <TextField label="Email" type="email" required {...field('email')} />
          <TextField label="Mobile number" required {...field('phone')} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }} />
        </div>
        <TextField label="Date of birth" type="date" required {...field('dob')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Residential address" required multiline minRows={2} {...field('address')} />
      </>}
      {step === 1 && <>
        <div className="cz-two">
          <TextField select label="ID type" {...field('idType')}>
            {['PAN', 'Aadhaar', 'Passport', 'Voter ID'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="ID number" required {...field('idNumber')} />
        </div>
        <label className="cz-drop">
          <FileUp size={24} /><strong>Upload identity and address proof</strong><span>PDF, JPG or PNG, up to 5 MB each</span>
          <input type="file" multiple accept=".pdf,image/*" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </label>
        {form.documents.map((doc, i) => <div key={doc.name + i} className="cz-file">
          <span>{doc.name}<small>{(doc.size / 1024).toFixed(0)} KB</small></span>
          <button type="button" aria-label={'Remove ' + doc.name} onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))}><X size={15} /></button>
        </div>)}
      </>}
      {step === 2 && <>
        <TextField label="Opening balance (INR)" required {...field('opening')} slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          helperText="Minimum ₹1,000" />
        <dl className="cz-review">
          <dt>Name</dt><dd>{form.name}</dd><dt>Email</dt><dd>{form.email}</dd><dt>Mobile</dt><dd>{form.phone}</dd>
          <dt>{form.idType}</dt><dd>{form.idNumber}</dd><dt>Documents</dt><dd>{form.documents.length} file(s)</dd>
        </dl>
      </>}
      {error && <Alert severity="error">{error}</Alert>}
      <div className="cz-row">
        {step > 0 && <Button variant="outlined" onClick={() => { setStep(step - 1); setError(''); }}>Back</Button>}
        <Button type="submit" variant="contained" size="large">{step < 2 ? 'Continue' : 'Submit application'}</Button>
      </div>
    </form>
    <p className="cz-switch">Already a customer? <button type="button" onClick={() => go('login')}>Sign in</button></p>
  </Shell>;
}

export function Status({ go }) {
  const { customers, outbox } = usePortal();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const q = searched.trim().toLowerCase();
  const found = q ? customers.filter(c => c.email === q || c.id.toLowerCase() === q) : [];
  return <Shell go={go} aside={<>
    <div className="cz-orb small" /><GlassCard className="cz-auth-card" number="P625 •••• ••••" holder="APPLICATION" label="Status" />
    <h2>Where's my account?</h2><p>Look up your application by email or application ID.</p>
  </>}>
    <h1>Track your application</h1>
    <form className="cz-form cz-search" onSubmit={e => { e.preventDefault(); setSearched(query); }}>
      <TextField label="Email or application ID" value={query} onChange={e => setQuery(e.target.value)} required />
      <Button type="submit" variant="contained" startIcon={<Search size={16} />}>Find</Button>
    </form>
    {searched && !found.length && <Alert severity="info">No application matches “{searched}”.</Alert>}
    {found.map(c => <div className="cz-status-card" key={c.id}>
      <div className="cz-row between"><span className="cz-row"><UserRound size={18} /><strong>{c.name}</strong></span><Pill status={c.status} /></div>
      <dl className="cz-review">
        <dt>Application</dt><dd>{c.id}</dd><dt>Submitted</dt><dd>{time(c.createdAt)}</dd>
        <dt>Opening balance</dt><dd>{money(c.openingMinor)}</dd>
        {c.accountNumber && <><dt>Account number</dt><dd>{c.accountNumber}</dd></>}
        {c.note && <><dt>Note</dt><dd>{c.note}</dd></>}
      </dl>
      {outbox.filter(m => m.to === c.email).slice(0, 3).map(m => <div className="cz-mail" key={m.id}>
        <small>{time(m.sentAt)}</small><strong>{m.subject}</strong><p>{m.body}</p></div>)}
    </div>)}
    <p className="cz-switch"><button type="button" onClick={() => go('register')}>Open an account</button> · <button type="button" onClick={() => go('login')}>Sign in</button></p>
  </Shell>;
}
