import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { lagosDate, naira, time12 } from '../lib/format.js';
import { toast } from '../lib/toast.js';

const OLABEL = { pending_payment: 'Not paid', received: 'Sent', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', out_for_delivery: 'On the way', completed: 'Completed', rejected: 'Declined', cancelled: 'Cancelled' };
const RLABEL = { pending_payment: 'Not paid', confirmed: 'Confirmed', seated: 'Seated', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed' };

export default function Me() {
  const { user, requireLogin, logout, setUser } = useAuth();
  const p = new URLSearchParams(location.search);
  const [tab, setTab] = useState(p.get('tab') === 'bookings' ? 'bookings' : 'orders');
  const [orders, setOrders] = useState(null); const [books, setBooks] = useState(null);
  const [edit, setEdit] = useState(false); const [form, setForm] = useState({ full_name: '', email: '' });
  const load = () => { api('/orders/me').then((r) => setOrders(r.orders)).catch(() => setOrders([])); api('/reservations/me').then((r) => setBooks(r.reservations)).catch(() => setBooks([])); };
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line
  useEffect(() => { if (p.get('new')) toast('Table booked! See you there.'); }, []); // eslint-disable-line

  if (!user) return (
    <div className="page"><h1 className="ptitle">Your FoodTalk</h1>
      <div className="emptybox"><span>👋</span><p>Sign in to see your orders and table bookings.</p>
        <button className="btn primary" onClick={() => requireLogin().catch(() => {})}>Sign in with your phone</button></div>
      <BottomNav /></div>
  );
  async function save(e) {
    e.preventDefault();
    try { const r = await api('/customers/me', { method: 'PATCH', body: { full_name: form.full_name || undefined, email: form.email || undefined } }); setUser(r.user); setEdit(false); toast('Saved'); }
    catch (x) { toast(x.message); }
  }
  async function cancelBooking(b) {
    if (!confirm(b.status === 'confirmed' ? 'Cancel this booking? The booking fee is not refunded.' : 'Cancel this booking?')) return;
    try { await api(`/reservations/${b.id}/cancel`, { method: 'POST', body: {} }); toast('Booking cancelled'); load(); } catch (x) { toast(x.message); }
  }
  return (
    <div className="page me">
      <div className="profile">
        <div className="avatar">{(user.full_name || 'F')[0].toUpperCase()}</div>
        <div><b>{user.full_name || 'FoodTalk friend'}</b><span className="muted small">{user.phone}{user.email ? ` · ${user.email}` : ''}</span></div>
        <button className="link" onClick={() => { setForm({ full_name: user.full_name || '', email: user.email || '' }); setEdit(!edit); }}>Edit</button>
      </div>
      {edit && <form className="card" onSubmit={save}>
        <label className="field"><span>Name</span><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={60} /></label>
        <label className="field"><span>Email for receipts</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <button className="btn primary block">Save</button></form>}
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>Orders</button>
        <button role="tab" aria-selected={tab === 'bookings'} onClick={() => setTab('bookings')}>Table bookings</button>
      </div>
      {tab === 'orders' && (orders === null ? <div className="spinner dark" /> : !orders.length ? <p className="muted pad">No orders yet. <Link to="/">Find something tasty</Link>.</p> :
        orders.map((o) => (
          <Link className="listrow" to={`/o/${o.id}`} key={o.id}>
            <div><b>{o.business_name}</b><span className="muted small">{lagosDate(o.created_at)} · {o.fulfillment_type}</span></div>
            <div className="right"><span className={'pill s-' + o.status}>{OLABEL[o.status] || o.status}</span><span className="small">{naira(o.total)}</span></div>
          </Link>)))}
      {tab === 'bookings' && (books === null ? <div className="spinner dark" /> : !books.length ? <p className="muted pad">No table bookings yet.</p> :
        books.map((b) => (
          <div className="listrow" key={b.id}>
            <div><b>{b.business_name}</b><span className="muted small">{lagosDate(String(b.reservation_date).slice(0, 10) + 'T12:00:00Z')} · {time12(b.reservation_time)} · {b.party_size} {b.party_size === 1 ? 'person' : 'people'}{b.table_name ? ` · ${b.table_name}` : ''}</span></div>
            <div className="right"><span className={'pill s-' + b.status}>{RLABEL[b.status] || b.status}</span>
              {['pending_payment', 'confirmed'].includes(b.status) && <button className="link small" onClick={() => cancelBooking(b)}>Cancel</button>}</div>
          </div>)))}
      <button className="link center block" onClick={() => { logout(); toast('Signed out'); }}>Sign out</button>
      <BottomNav />
    </div>
  );
}
