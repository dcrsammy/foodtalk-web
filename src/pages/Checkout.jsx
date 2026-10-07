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
  const { requireLogin, user, setUser } = useAuth();
  const [area, setArea] = useState(() => localStorage.getItem('ft_area') || '');
  const [phone, setPhone] = useState('');
  const [askPhone, setAskPhone] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [mode, setMode] = useState('');
  const [address, setAddress] = useState(() => localStorage.getItem('ft_addr') || '');
  const [promo, setPromo] = useState(''); const [promoOn, setPromoOn] = useState('');
  const [quote, setQuote] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cart) return;
    api(`/vendors/${cart.vendor_id}`, { auth: false }).then((d) => {
      const v = { ...d.vendor, delivers: d.vendor.offers_delivery && (d.vendor.delivery_zones || []).length > 0 };
      setVendor(v); setMode((m) => m || (v.delivers ? 'delivery' : 'pickup'));
      if (!(v.delivery_zones || []).some((z) => z.area === localStorage.getItem('ft_area'))) setArea('');
    }).catch((x) => setErr(x.message));
  }, [cart?.vendor_id]); // eslint-disable-line

  const body = cart && { vendor_id: cart.vendor_id, fulfillment_type: mode, delivery_address: mode === 'delivery' ? address : undefined,
    delivery_area: mode === 'delivery' ? area || undefined : undefined,
    items: cart.items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })), promo_code: promoOn || undefined };
  const key = JSON.stringify(body);
  useEffect(() => {
    if (!cart || !mode) return; setErr('');
    if (mode === 'delivery' && !area) { setQuote(null); return; }
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
    if (mode === 'delivery' && !area) return setErr('Pick your area so we can work out the delivery fee.');
    if (mode === 'delivery' && address.trim().length < 8) return setErr('Add your full delivery address so the rider can find you.');
    let u;
    try { u = await requireLogin('Sign in to place your order. We\'ll let you know when it\'s on the way.'); } catch { return; }
    const hasPhone = u && (u.contact_phone || u.phone);
    if (!hasPhone && phone.replace(/\D/g, '').length < 10) { setAskPhone(true); return setErr('Add a phone number so the restaurant and rider can reach you.'); }
    setBusy(true);
    try {
      if (mode === 'delivery') { localStorage.setItem('ft_addr', address.trim()); localStorage.setItem('ft_area', area); }
      const r = await api('/orders', { method: 'POST', body: { ...body, delivery_address: mode === 'delivery' ? address.trim() : undefined, contact_phone: phone.trim() || undefined } });
      if (phone.trim()) setUser((p) => p && { ...p, contact_phone: r.order.contact_phone });
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
          {vendor.delivers && <button role="radio" aria-checked={mode === 'delivery'} onClick={() => setMode('delivery')}>Delivery</button>}
          {vendor.offers_pickup && <button role="radio" aria-checked={mode === 'pickup'} onClick={() => setMode('pickup')}>Pickup</button>}
        </div>
      )}
      {mode === 'delivery' && vendor && <>
        <label className="field"><span>Your area</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Choose your area…</option>
            {[...vendor.delivery_zones].sort((a, b) => a.area.localeCompare(b.area)).map((z) => <option key={z.area} value={z.area}>{z.area} · {Number(z.fee) ? naira(z.fee) : 'free'}</option>)}
          </select>
          <i className="muted small">Not listed? {vendor.business_name} doesn't deliver there yet{vendor.offers_pickup ? '. You can pick up instead.' : '.'}</i>
        </label>
        <label className="field"><span>Delivery address</span><textarea rows={2} placeholder="House number, street, landmark" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          <i className="muted small">{vendor.business_name} delivers with its own rider.{Number(vendor.free_delivery_min) > 0 ? ` Free delivery on food from ${naira(vendor.free_delivery_min)}.` : ''}{Number(vendor.delivery_min_order) > 0 ? ` Minimum ${naira(vendor.delivery_min_order)} of food for delivery.` : ''}</i></label>
      </>}
      {(askPhone || (user && !user.contact_phone && !user.phone)) && (
        <label className="field"><span>Phone for the rider</span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <i className="muted small">Only the restaurant and its rider see this.</i></label>
      )}
      {mode === 'pickup' && vendor && <p className="muted small pad0">Pick up at {vendor.address || vendor.business_name}. We'll tell you when it's ready.</p>}
      <div className="promo">
        <input placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} maxLength={30} />
        <button className="btn" onClick={() => setPromoOn(promo.trim())} disabled={!promo.trim()}>Apply</button>
      </div>
      {quote && (
        <div className="card sums">
          <div><span>Food</span><span>{naira(quote.subtotal)}</span></div>
          {quote.discount > 0 && <div className="good"><span>Promo {quote.promo_code}</span><span>−{naira(quote.discount)}</span></div>}
          {mode === 'delivery' && <div className={quote.free_delivery ? 'good' : ''}><span>Delivery{area ? ` to ${area}` : ''}</span><span>{quote.free_delivery ? 'Free' : naira(quote.delivery_fee)}</span></div>}
          {quote.consumption_tax > 0 && <div><span>Consumption tax (5%)</span><span>{naira(quote.consumption_tax)}</span></div>}
          {quote.vat > 0 && <div><span>VAT (7.5%)</span><span>{naira(quote.vat)}</span></div>}
          <div><span>Service fee</span><span>{naira(quote.service_fee)}</span></div>
          {quote.prices_include_tax && <p className="muted small" style={{ margin: '4px 0 0' }}>Menu prices include tax.</p>}
          <div className="total"><span>Total</span><span>{naira(quote.total)}</span></div>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="paybar"><button className="btn primary block" onClick={pay} disabled={busy || !quote}>{busy ? 'Opening payment…' : quote ? `Pay ${naira(quote.total)}` : mode === 'delivery' && !area ? 'Choose your area' : 'Working out total…'}</button>
        <p className="muted small center">Secure payment by Paystack · card, transfer or USSD</p></div>
    </div>
  );
}
