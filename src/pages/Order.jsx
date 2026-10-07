import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { socket } from '../lib/socket.js';
import { directions, lagosTime, naira } from '../lib/format.js';
import { toast } from '../lib/toast.js';
import { enablePush } from '../lib/push.js';

const STEPS = { delivery: ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'], pickup: ['received', 'accepted', 'preparing', 'ready', 'completed'] };
const LABEL = { pending_payment: 'Waiting for payment', received: 'Sent to the restaurant', accepted: 'Accepted', preparing: 'Being prepared', ready: 'Ready', out_for_delivery: 'On the way', completed: 'Completed', rejected: 'Declined by the restaurant', cancelled: 'Cancelled', expired: 'Payment not completed' };

export default function Order() {
  const { id } = useParams(); const nav = useNavigate();
  const { requireLogin, user } = useAuth();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const [issue, setIssue] = useState(null);
  const load = () => api(`/orders/${id}`).then(setD).catch((x) => setErr(x.message));
  useEffect(() => { requireLogin('Sign in to see your order.').then(load).catch(() => nav('/')); }, [id]); // eslint-disable-line
  useEffect(() => {
    if (!user) return;
    const s = socket(); const f = (o) => { if (o.id === id) { setD((p) => p && { ...p, order: { ...p.order, ...o } }); navigator.vibrate?.(30); } };
    s?.on('order_status_update', f);
    const t = setInterval(load, 30000);
    if (new URLSearchParams(location.search).get('new')) enablePush().catch(() => {});
    return () => { s?.off('order_status_update', f); clearInterval(t); };
  }, [user, id]); // eslint-disable-line

  if (err) return <div className="page"><p className="err">{err}</p><Link className="btn" to="/me">My orders</Link></div>;
  if (!d) return <div className="page center"><div className="spinner dark" /></div>;
  const o = d.order, steps = STEPS[o.fulfillment_type] || STEPS.pickup, at = steps.indexOf(o.status);
  const done = ['rejected', 'cancelled', 'expired'].includes(o.status);

  async function cancel() {
    if (!confirm(o.status === 'received' ? 'Cancel this order? You get a full refund.' : 'Cancel this order?')) return;
    try { const r = await api(`/orders/${id}/cancel`, { method: 'POST', body: {} }); toast(r.refunded ? 'Cancelled. Your refund is on the way.' : 'Order cancelled'); load(); }
    catch (x) { toast(x.message); }
  }
  async function report(e) {
    e.preventDefault();
    try { await api('/disputes', { method: 'POST', body: { order_id: id, reason: issue } }); setIssue(null); toast("Thanks. We'll look into it and get back to you."); }
    catch (x) { toast(x.message); }
  }

  return (
    <div className="page order">
      <div className="ptop"><button className="back" onClick={() => nav('/me')} aria-label="Back"><Icon name="back" /></button><h1 className="ptitle">{o.business_name}</h1></div>
      <div className={'statuscard' + (done ? ' bad' : o.status === 'completed' ? ' good' : '')}>
        <span className="muted small">{o.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'} · #{o.id.slice(0, 6).toUpperCase()}</span>
        <h2>{LABEL[o.status] || o.status}</h2>
        {o.estimated_ready_at && !done && o.status !== 'completed' && <p>Ready around <b>{lagosTime(o.estimated_ready_at)}</b></p>}
        {o.status === 'rejected' && <p>{o.cancel_reason || 'The restaurant could not take this order.'} A full refund is on its way to your card or bank.</p>}
        {o.status === 'cancelled' && o.refund_status && <p>Your refund is on its way to your card or bank.</p>}
      </div>
      {!done && at >= 0 && (
        <ol className="steps">{steps.map((s, i) => <li key={s} className={i < at ? 'past' : i === at ? 'now' : ''}><span className="dot">{i < at ? <Icon name="check" size={14} /> : null}</span>{LABEL[s]}</li>)}</ol>
      )}
      <div className="card">
        {d.items.map((i, k) => <div className="row-between" key={k}><span>{i.quantity} × {i.name}</span><span>{naira(i.unit_price * i.quantity)}</span></div>)}
        <hr />
        {Number(o.discount_amount) > 0 && <div className="row-between good"><span>Promo</span><span>−{naira(o.discount_amount)}</span></div>}
        <div className="row-between muted"><span>Service fee</span><span>{naira(Number(o.total) - Number(o.subtotal) + Number(o.discount_amount || 0))}</span></div>
        <div className="row-between"><b>Paid</b><b>{naira(o.total)}</b></div>
        {o.delivery_address && <p className="muted small">Deliver to: {o.delivery_address}</p>}
      </div>
      <div className="rbtns">
        {o.vendor_phone && <a className="btn" href={`tel:${o.vendor_phone}`}><Icon name="phone" size={18} /> Call restaurant</a>}
        <a className="btn" href={directions({ latitude: o.vendor_latitude, longitude: o.vendor_longitude, business_name: o.business_name, address: o.vendor_address })} target="_blank" rel="noopener"><Icon name="pin" size={18} /> Directions</a>
      </div>
      {['pending_payment', 'received'].includes(o.status) && <button className="btn danger block" onClick={cancel}>Cancel order</button>}
      {!['pending_payment', 'expired'].includes(o.status) && (issue === null
        ? <button className="link center block" onClick={() => setIssue('')}>Something went wrong with this order?</button>
        : <form className="card" onSubmit={report}><b>Tell us what happened</b><textarea rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. An item was missing" minLength={10} required /><button className="btn primary block">Send to FoodTalk</button></form>)}
    </div>
  );
}
