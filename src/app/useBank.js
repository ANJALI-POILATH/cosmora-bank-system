// Worker session: sign-in, dashboard polling, bank directory and idempotent transfers.
// Same API calls as the original LiveBank component.
import { useCallback, useEffect, useRef, useState } from 'react';
import { configuredEndpoint, liveApi, readStorage, saveStorage } from '../live-api';

const SESSION_KEY = 'cosmora-session';
const empty = { accounts: [], transfers: [] };

export function useBank(bank) {
  const base = configuredEndpoint || readStorage(localStorage, 'x42-cloudflare-worker-url', '');
  const prefix = '/banks/' + bank.id;
  const [session, setSessionState] = useState(() => {
    const saved = readStorage(sessionStorage, SESSION_KEY, null);
    return saved && saved.expiresAt > Date.now() ? saved : null;
  });
  const [data, setData] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [directory, setDirectory] = useState([]);
  const activeToken = useRef(null);
  activeToken.current = session?.token;
  const pending = useRef(new Map());

  const setSession = useCallback(value => {
    saveStorage(sessionStorage, SESSION_KEY, value);
    setSessionState(value);
    if (!value) { setData(empty); setLoaded(false); }
  }, []);

  const refresh = useCallback(async signal => {
    if (!session) return;
    try {
      const value = await liveApi(base, prefix + '/dashboard', { token: session.token, signal });
      if (signal?.aborted || activeToken.current !== session.token) return;
      setData(value); setLoaded(true); setError('');
    } catch (failure) {
      if (signal?.aborted || activeToken.current !== session.token) return;
      if (failure.status === 401) setSession(null);
      setError(failure.message);
    }
  }, [base, prefix, session, setSession]);

  useEffect(() => {
    if (!session) return undefined;
    const controller = new AbortController();
    const update = () => { if (document.visibilityState === 'visible') refresh(controller.signal); };
    refresh(controller.signal);
    const timer = setInterval(update, 12_000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); controller.abort(); document.removeEventListener('visibilitychange', update); };
  }, [session, refresh]);

  useEffect(() => {
    if (!base) return undefined;
    const controller = new AbortController();
    liveApi(base, '/directory/banks', { signal: controller.signal })
      .then(value => setDirectory(value.banks || []))
      .catch(() => {});
    return () => controller.abort();
  }, [base]);

  async function signIn(email, password) {
    const value = await liveApi(base, prefix + '/sign-in', { data: { email: email.trim(), password } });
    setError('');
    setSession(value);
    return value;
  }

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
    await refresh();
    return row;
  }

  return { base, session, data, loaded, error, setError, directory, signIn, signOut: () => setSession(null), refresh, send };
}
