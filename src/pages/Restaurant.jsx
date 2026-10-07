import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { bump, qtyOf, useCart, cartCount, cartTotal } from '../lib/cart.js';
import { cdn, directions, km, naira } from '../lib/format.js';
import { getLoc } from '../lib/geo.js';
import { toast } from '../lib/toast.js';

function Stars({ value, size = 16 }) {
  return <span className="stars" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} fill={i <= Math.round(value) ? '#ffb020' : '#d8d2c8'} />)}</span>;
}

export default function Restaurant() {
  const { id } = useParams(); const nav = useNavigate();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const [tab, setTab] = useState('menu');
  const [reviews, setReviews] = useState(null);
  const [mine, setMine] = useState({ rating: 0, comment: '' });
  const cart = useCart();
  const { requireLogin } = useAuth();

  useEffect(() => { api(`/vendors/${id}`, { auth: false }).then(setD).catch((x) => setErr(x.message)); }, [id]);
  useEffect(() => { if (tab === 'reviews' && !reviews) api(`/vendors/${id}/reviews`, { auth: false }).then((r) => setReviews(r.reviews)).catch(() => setReviews([])); }, [tab, id, reviews]);
  const groups = useMemo(() => {
    const g = new Map(); (d?.menu || []).forEach((m) => { const k = m.category_name || 'Menu'; if (!g.has(k)) g.set(k, []); g.get(k).push(m); }); return [...g];
  }, [d]);

  if (err) return <div className="page"><p className="err">{err}</p><Link to="/" className="btn">Back to the feed</Link></div>;
  if (!d) return <div className="page center"><div className="spinner dark" /></div>;
  const v = d.vendor, loc = getLoc();
  const dist = loc && v.latitude ? (() => { const R = 6371, r = (x) => (x * Math.PI) / 180, a = Math.sin(r(v.latitude - loc.lat) / 2) ** 2 + Math.cos(r(loc.lat)) * Math.cos(r(v.latitude)) * Math.sin(r(v.longitude - loc.lng) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); })() : null;
  const hero = d.videos[0];
  const n = cart?.vendor_id === v.id ? cartCount(cart) : 0;

  async function sendReview(e) {
    e.preventDefault();
    if (!mine.rating) return toast('Tap the stars to rate');
    try { await requireLogin('Sign in to leave a review.'); } catch { return; }
    try { await api(`/vendors/${id}/reviews`, { method: 'POST', body: mine }); toast('Thanks for your review!'); setReviews(null); setMine({ rating: 0, comment: '' }); api(`/vendors/${id}`, { auth: false }).then(setD); }
    catch (x) { toast(x.message); }
  }

  return (
    <div className="page rpage">
      <div className="rhero">
        {hero ? <video src={cdn(hero.video_url)} poster={cdn(hero.thumbnail_url, 'image')} autoPlay muted loop playsInline /> : <div className="rhero-ph">🍲</div>}
        <button className="back glass" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back"><Icon name="back" /></button>
      </div>
      <div className="rhead">
        <h1>{v.business_name}</h1>
        <div className="rmeta">
          {Number(d.rating.review_count) > 0 ? <><Stars value={Number(d.rating.avg_rating)} /> <b>{Number(d.rating.avg_rating).toFixed(1)}</b> <span className="muted">({d.rating.review_count})</span></> : <span className="muted">New on FoodTalk</span>}
          {dist != null && <span className="muted">· {km(dist)}</span>}
        </div>
        <p className="muted small">{[v.address, v.city].filter(Boolean).join(', ')}</p>
        <div className="tags">
          {v.offers_delivery && (v.delivery_zones || []).length > 0 && <span className="tag">Delivery from {naira(Math.min(...v.delivery_zones.map((z) => Number(z.fee))))}</span>}
          {v.offers_pickup && <span className="tag">Pickup</span>}
          {v.offers_dine_in && <span className="tag">Dine-in</span>}
        </div>
        <div className="rbtns">
          <a className="btn" href={directions(v)} target="_blank" rel="noopener"><Icon name="pin" size={18} /> Directions</a>
          {v.phone && <a className="btn" href={`tel:${v.phone}`}><Icon name="phone" size={18} /> Call</a>}
          {v.offers_dine_in && <Link className="btn" to={`/book/${v.id}`}><Icon name="table" size={18} /> Book</Link>}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {[['menu', 'Menu'], ['videos', `Videos (${d.videos.length})`], ['reviews', 'Reviews']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'menu' && (
        <div className="menu">
          {!d.menu.length && <p className="muted pad">The menu is coming soon.</p>}
          {groups.map(([cat, items]) => (
            <section key={cat}>
              {groups.length > 1 && <h3>{cat}</h3>}
              {items.map((m) => {
                const q = qtyOf(cart, m.id);
                return (
                  <div className={'mitem' + (m.is_available ? '' : ' off')} key={m.id}>
                    <div className="mtext">
                      <b>{m.name}</b>
                      {m.description && <p className="muted small">{m.description}</p>}
                      <span className="price">{naira(m.price)}</span>
                    </div>
                    {m.photo_url && <img src={cdn(m.photo_url, 'image')} alt="" loading="lazy" />}
                    {!m.is_available ? <span className="soldout">Sold out</span> : ((v.offers_delivery && (v.delivery_zones || []).length > 0) || v.offers_pickup) && (
                      q ? <div className="stepper"><button onClick={() => bump(v, m, -1)} aria-label={`One less ${m.name}`}><Icon name="minus" size={18} /></button><b>{q}</b><button onClick={() => bump(v, m, 1)} aria-label={`One more ${m.name}`}><Icon name="plus" size={18} /></button></div>
                        : <button className="add" onClick={() => bump(v, m, 1)} aria-label={`Add ${m.name}`}><Icon name="plus" size={20} /></button>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {tab === 'videos' && (
        <div className="vgrid">
          {d.videos.map((x) => (
            <a key={x.id} href={cdn(x.video_url)} target="_blank" rel="noopener" className="vthumb">
              {x.thumbnail_url ? <img src={cdn(x.thumbnail_url, 'image')} alt={x.caption || ''} loading="lazy" /> : <video src={cdn(x.video_url)} muted preload="metadata" />}
              <span><Icon name="heart" size={14} /> {x.likes_count || 0}</span>
            </a>
          ))}
          {!d.videos.length && <p className="muted pad">No videos yet.</p>}
        </div>
      )}
      {tab === 'reviews' && (
        <div className="reviews pad">
          <form className="card" onSubmit={sendReview}>
            <b>Been here? Rate it</b>
            <div className="rate">{[1, 2, 3, 4, 5].map((i) => <button type="button" key={i} onClick={() => setMine({ ...mine, rating: i })} aria-label={`${i} stars`}><Icon name="star" size={30} fill={i <= mine.rating ? '#ffb020' : '#d8d2c8'} /></button>)}</div>
            <textarea placeholder="What did you eat? How was it?" maxLength={600} value={mine.comment} onChange={(e) => setMine({ ...mine, comment: e.target.value })} />
            <button className="btn primary block">Post review</button>
          </form>
          {reviews === null ? <div className="spinner dark" /> : reviews.length === 0 ? <p className="muted">No reviews yet. Be the first.</p> :
            reviews.map((r) => <div className="review" key={r.id}><div className="row-between"><b>{r.author}</b><Stars value={r.rating} size={14} /></div>{r.comment && <p>{r.comment}</p>}<span className="muted small">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>)}
        </div>
      )}

      {n > 0 && (
        <button className="cartbar" onClick={() => nav('/checkout')}>
          <span className="cnt">{n}</span><span>View cart</span><b>{naira(cartTotal(cart))}</b>
        </button>
      )}
    </div>
  );
}
