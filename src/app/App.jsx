import { useEffect, useState } from 'react';
import { Login, Register, Status } from './Auth';
import Admin from './Admin';
import Customer from './Customer';
import Landing from './Landing';
import { ADMIN_EMAIL } from './store';
import { useBank } from './useBank';
import './app.css';

const pages = ['landing', 'login', 'register', 'status'];
const fromHash = () => { const h = location.hash.slice(1); return pages.includes(h) ? h : 'landing'; };

export default function App({ bank }) {
  const bankApi = useBank(bank);
  const [page, setPage] = useState(fromHash);

  useEffect(() => {
    const onHash = () => setPage(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function go(next) {
    if (next === 'landing') history.pushState(null, '', location.pathname + location.search);
    else location.hash = next;
    setPage(next);
    window.scrollTo(0, 0);
  }

  const { session } = bankApi;
  if (session) {
    const signOut = () => { bankApi.signOut(); go('landing'); };
    const api = { ...bankApi, signOut };
    return session.email.toLowerCase() === ADMIN_EMAIL ? <Admin bankApi={api} bank={bank} /> : <Customer bankApi={api} bank={bank} />;
  }
  if (page === 'login') return <Login go={go} signIn={bankApi.signIn} />;
  if (page === 'register') return <Register go={go} />;
  if (page === 'status') return <Status go={go} />;
  return <Landing go={go} directory={bankApi.directory} />;
}
