import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { bump, clearCart, useCart } from '../lib/cart.js';
import { naira } from '../lib/format.js';

export default function Checkout() {
  const cart = useCart(); const nav = useNavigate();
  const { requireLogin } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [mode, setMode] = useState('');
  const [address, setAddress] = useState(() => localStorage.getItem('ft_addr') || '');
  const [promo, setPromo] = useState(''); const [promoOn, setPromoOn] = useState('');
  const [quote, setQuote] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cart) return;
    api(`/vendors/${cart.vendor_id}`, { auth: false }).then((d) => { setVendor(d.vendor); setMode((m) => m || (d.vendor.offers_delivery ? 'delivery' : 'pickup')); }).catch((x) => setErr(x.message));
  }, [cart?.vendor_id]); // eslint-disable-line

  const body = cart && { vendor_id: cart.vendor_id, fulfillment_type: mode, delivery_address: mode === 'delivery' ? address : undefined,
    items: cart.items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })), promo_code: promoOn || undefined };
  const key = JSON.stringify(body);
  useEffect(() => {
    if (!cart || !mode) return; setErr('');
    const t = setTimeout(() => api('/orders/quote', { method: 'POST', body: { ...body, delivery_address: mode === 'delivery' ? (address.length >= 8 ? address : 'pending address') : undefined }, auth: false })
      .then(setQuote).catch((x) => { setQuote(null); setErr(x.message); if (promoOn && /promo/i.test(x.message)) setPromoOn(''); }), 250);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line

  if (!cart) return (
    <div className="page"><h1 className="ptitle">Your cart</h1>
      <div className="emptybox"><span>🛍️</span><p>Your cart is empty.</p><Link className="btn primary" to="/">Find something tasty</Link></div><BottomNav /></div>
  );

  async function pay() {
    setErr('');
    if (mode === 'delivery' && address.trim().length < 8) return setErr('Add your full delivery address so the rider can find you.');
    try { await requireLogin('Sign in to place your order. We\'ll text you when it\'s on the way.'); } catch { return; }
    setBusy(true);
    try {
      if (mode === 'delivery') localStorage.setItem('ft_addr', address.trim());
      const r = await api('/orders', { method: 'POST', body: { ...body, delivery_address: mode === 'delivery' ? address.trim() : undefined } });
      localStorage.setItem('ft_pending', JSON.stringify({ type: 'order', id: r.order.id }));
      clearCart();
      location.href = r.authorization_url;   // Paystack checkout, then back to /paid
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <div className="page checkout">
      <div className="ptop"><button className="back" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button><h1 className="ptitle">Checkout</h1></div>
      <Link to={`/r/${cart.vendor_id}`} className="from">From <b>{cart.vendor_name}</b></Link>
      <div className="card">
        {cart.items.map((i) => (
          <div className="cline" key={i.menu_item_id}>
            <div className="stepper sm"><button onClick={() => bump({ id: cart.vendor_id, business_name: cart.vendor_name }, { id: i.menu_item_id }, -1)} aria-label="Less"><Icon name="minus" size={16} /></button><b>{i.quantity}</b><button onClick={() => bump({ id: cart.vendor_id, business_name: cart.vendor_name }, { id: i.menu_item_id }, 1)} aria-label="More"><Icon name="plus" size={16} /></button></div>
            <span className="cname">{i.name}</span><span>{naira(i.price * i.quantity)}</span>
          </div>
        ))}
      </div>
      {vendor && (
        <div className="seg" role="radiogroup" aria-label="How do you want it?">
          {vendor.offers_delivery && <button role="radio" aria-checked={mode === 'delivery'} onClick={() => setMode('delivery')}>Delivery</button>}
          {vendor.offers_pickup && <button role="radio" aria-checked={mode === 'pickup'} onClick={() => setMode('pickup')}>Pickup</button>}
        </div>
      )}
      {mode === 'delivery' && <label className="field"><span>Delivery address</span><textarea rows={2} placeholder="House number, street, area, landmark" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /><i className="muted small">The restaurant delivers with its own rider and may call you about the delivery fee.</i></label>}
      {mode === 'pickup' && vendor && <p className="muted small pad0">Pick up at {vendor.address || vendor.business_name}. We'll tell you when it's ready.</p>}
      <div className="promo">
        <input placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} maxLength={30} />
        <button className="btn" onClick={() => setPromoOn(promo.trim())} disabled={!promo.trim()}>Apply</button>
      </div>
      {quote && (
        <div className="card sums">
          <div><span>Food</span><span>{naira(quote.subtotal)}</span></div>
          {quote.discount > 0 && <div className="good"><span>Promo {quote.promo_code}</span><span>−{naira(quote.discount)}</span></div>}
          <div><span>Service fee</span><span>{naira(quote.total - quote.subtotal + quote.discount)}</span></div>
          <div className="total"><span>Total</span><span>{naira(quote.total)}</span></div>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="paybar"><button className="btn primary block" onClick={pay} disabled={busy || !quote}>{busy ? 'Opening payment…' : quote ? `Pay ${naira(quote.total)}` : 'Working out total…'}</button>
        <p className="muted small center">Secure payment by Paystack · card, transfer or USSD</p></div>
    </div>
  );
}
