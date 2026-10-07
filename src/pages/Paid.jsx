import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

// Paystack sends the customer back here: /paid?reference=order_<id> or reservation_<id>
export default function Paid() {
  const nav = useNavigate();
  const [msg, setMsg] = useState('Confirming your payment…');
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    let ref = p.get('reference') || p.get('trxref') || '';
    if (!ref) { try { const x = JSON.parse(localStorage.getItem('ft_pending')); if (x) ref = `${x.type}_${x.id}`; } catch {} }
    const m = /^(order|reservation)_([0-9a-f-]{36})$/.exec(ref);
    if (!m) { setMsg("We couldn't find that payment."); setFailed({}); return; }
    const [, type, id] = m;
    let tries = 0, stop = false;
    (async function check() {
      try {
        await api(`/${type === 'order' ? 'orders' : 'reservations'}/${id}/verify-payment`, { method: 'POST' });
        localStorage.removeItem('ft_pending');
        nav(type === 'order' ? `/o/${id}?new=1` : `/me?tab=bookings&new=${id}`, { replace: true });
      } catch (x) {
        if (stop) return;
        if (x.status === 402 && tries++ < 6) { setMsg('Waiting for Paystack to confirm…'); setTimeout(check, 2500); return; }
        setMsg(x.status === 402 ? "Your payment didn't go through." : x.message); setFailed({ type, id });
      }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line
  return (
    <div className="page center paid">
      {!failed ? <div className="spinner dark" /> : <span className="big">😕</span>}
      <h2>{msg}</h2>
      {failed && <p className="muted">No money was taken if the payment failed. You can try again.</p>}
      {failed && <div className="col"><Link className="btn primary" to={failed.type === 'reservation' ? '/me?tab=bookings' : failed.id ? `/o/${failed.id}` : '/me'}>See my {failed.type === 'reservation' ? 'bookings' : 'orders'}</Link><Link className="btn" to="/">Back to the feed</Link></div>}
    </div>
  );
}
