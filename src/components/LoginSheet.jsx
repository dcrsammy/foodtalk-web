import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import Icon from './Icon.jsx';

// Phone number → 6-digit code. Shown over any page when an action needs an account.
export default function LoginSheet({ reason, onDone, onCancel }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState(() => localStorage.getItem('ft_phone') || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function send(e) {
    e?.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api('/auth/customer/request-otp', { method: 'POST', body: { phone }, auth: false });
      localStorage.setItem('ft_phone', phone); setDevCode(r.dev_otp || ''); setStep('code'); setWait(45);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function verify(e) {
    e?.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api('/auth/customer/verify-otp', { method: 'POST', body: { phone, code, full_name: name || undefined }, auth: false });
      onDone(r.token, r.user);
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  useEffect(() => { if (code.length === 6 && step === 'code' && !busy) verify(); }, [code]); // eslint-disable-line

  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button className="sheet-x" onClick={onCancel} aria-label="Close"><Icon name="close" /></button>
        <h2 id="login-title">{step === 'phone' ? 'Sign in to continue' : 'Enter your code'}</h2>
        <p className="muted">{step === 'phone' ? (reason || 'We use your number to send order updates.') : `We sent a 6-digit code to ${phone}.`}</p>
        {step === 'phone' ? (
          <form onSubmit={send}>
            <label className="field"><span>Phone number</span>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus /></label>
            <label className="field"><span>Your name <i>(optional)</i></span>
              <input autoComplete="name" placeholder="So the restaurant knows who to call" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={busy || phone.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <input ref={codeRef} className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="6-digit code" />
            {devCode && <p className="muted small">Test mode code: <b>{devCode}</b></p>}
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn primary block" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
            <div className="row-between small">
              <button type="button" className="link" onClick={() => { setStep('phone'); setCode(''); setErr(''); }}>Change number</button>
              <button type="button" className="link" disabled={wait > 0 || busy} onClick={send}>{wait ? `Resend in ${wait}s` : 'Resend code'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
