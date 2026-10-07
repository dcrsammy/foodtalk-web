import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setToken } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

// Google sends home-screen app users back here after "Continue with Google": /signed-in#token=… or #error=…
export default function SignedIn() {
  const nav = useNavigate(); const { reload } = useAuth();
  const [error, setError] = useState('');
  useEffect(() => {
    const p = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname);   // don't leave the login in the address bar
    if (p.get('token')) {
      setToken(p.get('token'));
      const back = localStorage.getItem('ft_return') || '/'; localStorage.removeItem('ft_return');
      reload().then(() => nav(back.startsWith('/') && !back.startsWith('//') ? back : '/', { replace: true }));
    } else setError(p.get('error') || 'Sign-in did not finish. Please try again.');
  }, []); // eslint-disable-line
  return (
    <div className="page center">
      {error ? <><span className="big">🙈</span><h2>{error}</h2><Link className="btn primary" to="/">Back to FoodTalk</Link></>
        : <><div className="spinner dark" /><p className="muted">Signing you in…</p></>}
    </div>
  );
}
