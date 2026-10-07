import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { cdn, km, naira } from '../lib/format.js';
import { locQuery } from '../lib/geo.js';

const CRAVINGS = ['Jollof', 'Suya', 'Shawarma', 'Small chops', 'Pepper soup', 'Amala', 'Pizza', 'Burger', 'Seafood', 'Grills', 'Asun', 'Ofada'];

export default function Search() {
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [r, setR] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const term = q.trim();
    history.replaceState(null, '', term ? `/search?q=${encodeURIComponent(term)}` : '/search');
    if (term.length < 2) { setR(null); return; }
    setBusy(true);
    const t = setTimeout(() => api(`/search?q=${encodeURIComponent(term)}&${locQuery()}`, { auth: false }).then(setR).catch(() => setR({ vendors: [], dishes: [] })).finally(() => setBusy(false)), 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="page search">
      <h1 className="ptitle">What are you craving?</h1>
      <label className="searchbox"><Icon name="search" /><input type="search" placeholder="Jollof, suya, a restaurant…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus enterKeyHint="search" /></label>
      {!r && <div className="cravings">{CRAVINGS.map((c) => <button key={c} className="chip" onClick={() => setQ(c)}>{c}</button>)}</div>}
      {busy && !r && <div className="spinner dark" />}
      {r && !r.vendors.length && !r.dishes.length && <p className="muted pad">Nothing for “{q}” yet. Try another dish.</p>}
      {r?.dishes.length > 0 && <><h3>Dishes</h3>{r.dishes.map((d) => (
        <Link to={`/r/${d.vendor_id}`} className="dish" key={d.id}>
          {d.photo_url ? <img src={cdn(d.photo_url, 'image')} alt="" loading="lazy" /> : <span className="ph">🍽️</span>}
          <div><b>{d.name}</b><span className="muted small">{d.business_name}{d.distance_km != null ? ` · ${km(d.distance_km)}` : ''}</span></div>
          <span className={'price' + (d.is_available ? '' : ' off')}>{d.is_available ? naira(d.price) : 'Sold out'}</span>
        </Link>))}</>}
      {r?.vendors.length > 0 && <><h3>Restaurants</h3>{r.vendors.map((v) => (
        <Link to={`/r/${v.id}`} className="dish" key={v.id}>
          {v.thumbnail_url ? <img src={cdn(v.thumbnail_url, 'image')} alt="" loading="lazy" /> : <span className="ph">🍲</span>}
          <div><b>{v.business_name}</b><span className="muted small">{[v.city, km(v.distance_km)].filter(Boolean).join(' · ')}</span></div>
        </Link>))}</>}
      <BottomNav />
    </div>
  );
}
