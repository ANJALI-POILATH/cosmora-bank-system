import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Container } from '@mui/material';
import { configuredEndpoint, liveApi, readStorage, saveStorage } from './live-api';
import { api } from './api';
import Cosmos from './components/Cosmos';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import ApplicationStatus from './components/ApplicationStatus';
import AdminConsole from './components/AdminConsole';

const sessionKey = 'cosmora-session';

export default function LiveBank({ bank, switchUrl }) {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');
  const [view, setView] = useState('home');
  const [session, setSession] = useState(() => {
    const saved = readStorage(sessionStorage, sessionKey, null);
    return saved && saved.expiresAt > Date.now() ? saved : null;
  });
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [data, setData] = useState({ accounts: [], transfers: [] });
  const [directory, setDirectory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeToken = useRef(null);
  activeToken.current = session?.token;
  const pending = useRef(new Map());
  const base = config?.x42Base || configuredEndpoint;
  const prefix = '/banks/' + bank.id;
  const isBanking = session?.role === 'CUSTOMER' && profile?.status === 'APPROVED';

  const loadConfig = useCallback(() => {
    setConfigError('');
    api('/config').then(setConfig).catch(failure => setConfigError(failure.message));
  }, []);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const logout = useCallback((message = '') => {
    setSession(null);
    setProfile(null);
    setLoaded(false);
    setRefreshing(false);
    setData({ accounts: [], transfers: [] });
    setNote('');
    setError(typeof message === 'string' ? message : '');
    saveStorage(sessionStorage, sessionKey, null);
  }, []);

  // Restore the profile for a saved session, and sign out when the token expires.
  useEffect(() => {
    if (!session) return undefined;
    if (!profile) {
      api('/me', { token: session.token }).then(setProfile).catch(failure => logout(failure.status === 401 ? 'Your session has expired. Sign in again.' : failure.message));
    }
    const timer = setTimeout(() => logout('Your session has expired. Sign in again.'), Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, profile, logout]);

  const refresh = useCallback(async signal => {
    if (!session || !base) return;
    setRefreshing(true);
    try {
      const value = await liveApi(base, prefix + '/dashboard', { token: session.token, signal });
      if (signal?.aborted || activeToken.current !== session.token) return;
      setData(value);
      setLoaded(true);
      setError('');
    } catch (failure) {
      if (signal?.aborted || activeToken.current !== session.token) return;
      if (failure.status === 401) { logout('Your session has expired. Sign in again.'); return; }
      setError(failure.message);
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }, [base, prefix, session, logout]);

  useEffect(() => {
    if (!isBanking) return undefined;
    const controller = new AbortController();
    const update = () => { if (document.visibilityState === 'visible') refresh(controller.signal); };
    refresh(controller.signal);
    const timer = setInterval(update, 12_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', update);
    };
  }, [isBanking, refresh]);

  useEffect(() => {
    if (!isBanking || !base) return undefined;
    const controller = new AbortController();
    liveApi(base, '/directory/banks', { signal: controller.signal })
      .then(value => setDirectory(value.banks || []))
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [base, isBanking]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [session, view]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const value = await api('/auth/sign-in', { body: { email: email.trim(), password } });
      const next = { token: value.token, uid: value.uid, email: value.email, role: value.role, expiresAt: value.expiresAt };
      saveStorage(sessionStorage, sessionKey, next);
      setProfile(value.profile);
      setSession(next);
    } catch (failure) { setError(failure.message); }
    finally { setPassword(''); setBusy(false); }
  }

  // Sends through the X42 network with a stable idempotency key per transfer.
  async function send(transfer) {
    const raw = JSON.stringify([bank.id, base, session.uid, transfer]);
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
    const hash = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const keyName = 'x42-pending-' + hash;
    const key = pending.current.get(keyName) || readStorage(sessionStorage, keyName, null) || crypto.randomUUID();
    pending.current.set(keyName, key);
    saveStorage(sessionStorage, keyName, key);
    const row = await liveApi(base, prefix + '/transfers', { token: session.token, data: transfer, key });
    pending.current.delete(keyName);
    saveStorage(sessionStorage, keyName, null);
    const verb = row.status === 'COMPLETED' ? 'Completed' : row.status === 'REJECTED' ? 'Rejected' :
      row.status === 'MANUAL_REVIEW' ? 'Manual review' : 'Accepted';
    setNote(verb + ' · ' + row.transferId);
    await refresh();
  }

  let screen;
  if (!session) {
    screen = view === 'register'
      ? <Register bank={bank} onBack={() => setView('home')} />
      : <>
        {configError && <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 2 }}>
          <Alert severity="warning" action={<Button color="inherit" size="small" onClick={loadConfig}>Retry</Button>}>{configError}</Alert>
        </Container>}
        <Landing bank={bank} switchUrl={switchUrl} error={error} busy={busy} mode={config?.mode}
          email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSignIn={signIn}
          onRegister={() => setView('register')} hasEndpoint />
      </>;
  } else if (!profile) {
    screen = <Box sx={{ minHeight: '100vh' }} />;
  } else if (session.role === 'ADMIN') {
    screen = <AdminConsole bank={bank} session={session} x42Base={base} switchUrl={switchUrl} onSignOut={logout} />;
  } else if (profile.status === 'APPROVED') {
    screen = <Dashboard bank={bank} switchUrl={switchUrl} session={session} data={data} loaded={loaded} directory={directory}
      error={error} note={note} clearNote={() => setNote('')} refresh={refresh} refreshing={refreshing} logout={() => logout()}
      send={send} canEditConnection={false} mode={config?.mode} profile={profile} onProfile={setProfile}
      onClosed={() => logout('Your accounts have been closed. Thank you for banking with ' + bank.name + '.')} />;
  } else {
    screen = <ApplicationStatus bank={bank} session={session} profile={profile} onProfile={setProfile} onSignOut={logout} />;
  }

  return <><Cosmos />{screen}</>;
}
