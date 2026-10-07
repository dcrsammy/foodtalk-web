import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api, API_BASE, getToken } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { socket } from '../lib/socket.js';
import { directions, lagosTime, naira } from '../lib/format.js';
import { toast } from '../lib/toast.js';
import { enablePush } from '../lib/push.js';

const STEPS = { delivery: ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'], pickup: ['received', 'accepted', 'preparing', 'ready', 'completed'] };
const LABEL = { pending_payment: 'Waiting for payment', received: 'Sent to the restaurant', accepted: 'Accepted', preparing: 'Being prepared', ready: 'Ready', out_for_delivery: 'On the way', completed: 'Completed', rejected: 'Declined by the restaurant', cancelled: 'Cancelled', expired: 'Payment not completed' };

const CATS = [['missing_item', 'Something was missing'], ['wrong_order', 'Wrong order'], ['quality', 'Cold, spoiled or not as described'],
  ['never_arrived', 'It never arrived'], ['late', 'Very late'], ['rider', 'Problem with the rider'], ['overcharged', 'Charged the wrong amount'], ['other', 'Something else']];
const OUTCOME = { refund_full: 'Refunded in full', refund_partial: 'Partly refunded', no_refund: 'No refund' };

function Report({ orderId, onSent }) {
  const [cat, setCat] = useState(''); const [text, setText] = useState(''); const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function send(e) {
    e.preventDefault(); setErr('');
    if (!cat) return setErr('Pick what went wrong');
    setBusy(true);
    const fd = new FormData(); fd.append('order_id', orderId); fd.append('category', cat); fd.append('reason', text.trim()); if (photo) fd.append('photo', photo);
    try {
      const r = await fetch(API_BASE + '/disputes', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send. Try again.');
      onSent(j.dispute);
    } catch (x) { setErr(x.message === 'Failed to fetch' ? 'No connection. Try again.' : x.message); setBusy(false); }
  }
  return (
    <form className="card report" onSubmit={send}>
      <b>What went wrong?</b>
      <div className="chips">{CATS.map(([k, l]) => <button type="button" key={k} className={'chip' + (cat === k ? ' on' : '')} aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>)}</div>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={cat === 'missing_item' ? 'Which item was missing?' : 'Tell us a little more'} required minLength={cat === 'other' ? 10 : 3} />
      <label className="photo-pick">
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files[0] || null)} hidden />
        <Icon name="camera" size={18} /> {photo ? photo.name.slice(0, 28) : 'Add a photo (optional)'}
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Sending…' : 'Send to FoodTalk'}</button>
      <p className="muted small center">The restaurant gets to reply, then FoodTalk decides, usually the same day.</p>
    </form>
  );
}

export default function Order() {
  const { id } = useParams(); const nav = useNavigate();
  const { requireLogin, user } = useAuth();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const [issue, setIssue] = useState(false);
  const [reports, setReports] = useState([]);
  const loadReports = () => api('/disputes/me').then((r) => setReports(r.disputes.filter((x) => x.order_id === id))).catch(() => {});
  const load = () => api(`/orders/${id}`).then(setD).catch((x) => setErr(x.message));
  useEffect(() => { requireLogin('Sign in to see your order.').then(() => { load(); loadReports(); }).catch(() => nav('/')); }, [id]); // eslint-disable-line
  useEffect(() => {
    if (!user) return;
    const s = socket(); const f = (o) => { if (o.id === id) { setD((p) => p && { ...p, order: { ...p.order, ...o } }); navigator.vibrate?.(30); } };
    s?.on('order_status_update', f);
    const g = () => loadReports(); s?.on('dispute_update', g);
    const t = setInterval(load, 30000);
    if (new URLSearchParams(location.search).get('new')) enablePush().catch(() => {});
    return () => { s?.off('order_status_update', f); s?.off('dispute_update', g); clearInterval(t); };
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
  const openReport = reports.find((r) => r.status === 'open');
  const completedAgo = o.status === 'completed' ? (Date.now() - new Date(o.updated_at)) / 36e5 : 0;
  const canReport = o.paystack_status === 'success' && !done && !openReport && completedAgo < 24;

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
        {o.fulfillment_type === 'delivery' && <div className="row-between muted"><span>Delivery{o.delivery_area ? ` to ${o.delivery_area}` : ''}</span><span>{Number(o.delivery_fee) ? naira(o.delivery_fee) : 'Free'}</span></div>}
        {Number(o.consumption_tax_amount) > 0 && <div className="row-between muted"><span>Consumption tax</span><span>{naira(o.consumption_tax_amount)}</span></div>}
        {Number(o.vat_amount) > 0 && <div className="row-between muted"><span>VAT</span><span>{naira(o.vat_amount)}</span></div>}
        <div className="row-between muted"><span>Service fee</span><span>{naira(Number(o.commission_amount) + Number(o.fee_vat_amount || 0))}</span></div>
        <div className="row-between"><b>Paid</b><b>{naira(o.total)}</b></div>
        {o.delivery_address && <p className="muted small">Deliver to: {o.delivery_address}</p>}
      </div>
      <div className="rbtns">
        {o.vendor_phone && <a className="btn" href={`tel:${o.vendor_phone}`}><Icon name="phone" size={18} /> Call restaurant</a>}
        <a className="btn" href={directions({ latitude: o.vendor_latitude, longitude: o.vendor_longitude, business_name: o.business_name, address: o.vendor_address })} target="_blank" rel="noopener"><Icon name="pin" size={18} /> Directions</a>
      </div>
      {['pending_payment', 'received'].includes(o.status) && <button className="btn danger block" onClick={cancel}>Cancel order</button>}
      {reports.map((r) => (
        <div key={r.id} className={'card reportstatus' + (r.status === 'open' ? '' : ' closed')}>
          <b>{r.status === 'open' ? 'We\'re looking into your report' : `${OUTCOME[r.outcome] || 'Report closed'}${Number(r.refund_amount) ? `: ${naira(r.refund_amount)}` : ''}`}</b>
          <p className="muted small">"{r.reason}"</p>
          {r.resolution_note && <p>FoodTalk: {r.resolution_note}</p>}
          {Number(r.refund_amount) > 0 && <p className="muted small">Refunds usually reach your card or bank in a few working days.</p>}
        </div>
      ))}
      {canReport && (issue
        ? <Report orderId={id} onSent={(dp) => { setIssue(false); setReports((p) => [dp, ...p]); toast("Thanks. We'll look into it and get back to you."); }} />
        : <button className="link center block" onClick={() => setIssue(true)}>Something went wrong with this order?</button>)}
    </div>
  );
}
