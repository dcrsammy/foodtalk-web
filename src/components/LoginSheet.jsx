import React, { useEffect, useRef, useState } from 'react';
import { api, API_BASE } from '../lib/api.js';
import Icon from './Icon.jsx';

// Sign-in sheet shown over any page when an action needs an account.
// 1) Continue with Google (free, one tap)  2) phone number → code by WhatsApp (SMS as backup).
let optionsCache = null;
const getOptions = () => (optionsCache ||= api('/auth/options', { auth: false }).catch(() => { optionsCache = null; return {}; }));
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = resolve; s.onerror = () => reject(new Error('Google sign-in could not load'));
    document.head.appendChild(s);
  });
}

function GoogleButton({ clientId, onCredential, onError }) {
  const box = useRef(null);
  useEffect(() => {
    let live = true;
    loadGsi().then(() => {
      if (!live || !box.current) return;
      const redirect = standalone();   // home-screen apps can't use pop-ups reliably, so they go via a redirect
      if (redirect) localStorage.setItem('ft_return', location.pathname + location.search);
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: redirect ? 'redirect' : 'popup',
        login_uri: `${API_BASE}/auth/customer/google/redirect`,
        callback: (r) => onCredential(r.credential),
        auto_select: false, itp_support: true,
      });
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(box.current.offsetWidth || 320, 400) });
    }).catch((e) => onError(e.message));
    return () => { live = false; };
  }, [clientId]); // eslint-disable-line
  return <div ref={box} className="gbtn" />;
}

export default function LoginSheet({ reason, onDone, onCancel }) {
  const [opts, setOpts] = useState(optionsCache && typeof optionsCache === 'object' && !optionsCache.then ? optionsCache : null);
  const [step, setStep] = useState('start');   // start | code
  const [phone, setPhone] = useState(() => localStorage.getItem('ft_phone') || '');
  const [code, setCode] = useState('');
  const [sentVia, setSentVia] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => { getOptions().then(setOpts); }, []);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function google(credential) {
    setErr(''); setBusy(true);
    try { const r = await api('/auth/customer/google', { method: 'POST', body: { credential }, auth: false }); onDone(r.token, r.user); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  async function send(via) {
    setErr(''); setBusy(true);
    try {
      const r = await api('/auth/customer/request-otp', { method: 'POST', body: { phone, via }, auth: false });
      localStorage.setItem('ft_phone', phone); setDevCode(r.dev_otp || ''); setSentVia(r.sent_via || via); setStep('code'); setWait(45);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function verify(e) {
    e?.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api('/auth/customer/verify-otp', { method: 'POST', body: { phone, code }, auth: false });
      onDone(r.token, r.user);
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  useEffect(() => { if (code.length === 6 && step === 'code' && !busy) verify(); }, [code]); // eslint-disable-line

  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const wa = opts?.whatsapp;
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button className="sheet-x" onClick={onCancel} aria-label="Close"><Icon name="close" /></button>
        <h2 id="login-title">{step === 'start' ? 'Sign in to continue' : 'Enter your code'}</h2>
        <p className="muted">{step === 'start' ? (reason || 'So we can keep your orders and bookings together.')
          : `We sent a 6-digit code to ${phone} by ${sentVia === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`}</p>

        {step === 'start' ? (
          <>
            {opts?.google_client_id && <>
              <GoogleButton clientId={opts.google_client_id} onCredential={google} onError={() => {}} />
              <div className="or"><span>or use your phone number</span></div>
            </>}
            <form onSubmit={(e) => { e.preventDefault(); send(wa ? 'whatsapp' : 'sms'); }}>
              <label className="field"><span>Phone number</span>
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              {err && <p className="err" role="alert">{err}</p>}
              <button className={'btn block ' + (wa ? 'wa' : 'primary')} disabled={busy || !phoneOk}>
                {busy ? 'Sending…' : wa ? 'Send code on WhatsApp' : 'Send code by SMS'}
              </button>
              {wa && <button type="button" className="link block center" disabled={busy || !phoneOk} onClick={() => send('sms')}>No WhatsApp? Send by SMS</button>}
            </form>
          </>
        ) : (
          <form onSubmit={verify}>
            <input ref={codeRef} className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="6-digit code" />
            {devCode && <p className="muted small">Test mode code: <b>{devCode}</b></p>}
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
            <div className="row-between small">
              <button type="button" className="link" onClick={() => { setStep('start'); setCode(''); setErr(''); }}>Change number</button>
              <button type="button" className="link" disabled={wait > 0 || busy} onClick={() => send('sms')}>
                {wait ? `Resend in ${wait}s` : sentVia === 'whatsapp' ? 'Send by SMS instead' : 'Resend code'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
