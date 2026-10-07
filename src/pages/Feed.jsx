import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../components/VideoCard.jsx';
import BottomNav from '../components/BottomNav.jsx';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { askLoc, getLoc, locQuery } from '../lib/geo.js';
import { toast } from '../lib/toast.js';

export default function Feed() {
  const [videos, setVideos] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [state, setState] = useState('loading');   // loading | ready | empty | error
  const [muted, setMuted] = useState(true);
  const [near, setNear] = useState(Boolean(getLoc()));
  const loading = useRef(false), scroller = useRef(null);

  const load = useCallback(async (reset) => {
    if (loading.current) return; loading.current = true;
    try {
      const q = [locQuery(), !reset && cursor ? `cursor=${encodeURIComponent(cursor)}` : '', 'limit=10'].filter(Boolean).join('&');
      const r = await api('/feed?' + q);
      setVideos((prev) => { const all = reset ? r.videos : [...prev, ...r.videos]; const seen = new Set(); return all.filter((v) => !seen.has(v.id) && seen.add(v.id)); });
      setCursor(r.next_cursor);
      setState((reset ? r.videos.length : 1) ? 'ready' : 'empty');
    } catch (x) { if (reset) setState('error'); toast(x.message); }
    loading.current = false;
  }, [cursor]);
  useEffect(() => { load(true); }, []); // eslint-disable-line

  // fetch more when the viewer is two videos from the end
  const onScroll = (e) => {
    const el = e.currentTarget, idx = Math.round(el.scrollTop / el.clientHeight);
    if (cursor && idx >= videos.length - 3) load(false);
  };
  async function nearMe() {
    try { await askLoc(); setNear(true); scroller.current?.scrollTo(0, 0); setCursor(null); loading.current = false; await load(true); toast('Showing food near you first'); }
    catch (x) { toast(x.message); }
  }
  const onLike = (id, r) => setVideos((vs) => vs.map((v) => (v.id === id ? { ...v, liked: r.liked, likes_count: r.likes_count } : v)));

  return (
    <div className="feedpage">
      <header className="feedtop">
        <span className="logo">Food<b>Talk</b></span>
        <button className={'chip glass' + (near ? ' on' : '')} onClick={nearMe}><Icon name="pin" size={16} /> {near ? 'Near you' : 'Near me'}</button>
      </header>
      <main className="feed" ref={scroller} onScroll={onScroll}>
        {state === 'loading' && <div className="vcard skeleton"><div className="spinner" /></div>}
        {state === 'empty' && <div className="vcard empty"><h2>The kitchen is warming up</h2><p>Restaurants are adding their first videos. Check back soon, or search for a dish.</p><Link className="btn primary" to="/search">Search food</Link></div>}
        {state === 'error' && <div className="vcard empty"><h2>Couldn't load the feed</h2><button className="btn primary" onClick={() => load(true)}>Try again</button></div>}
        {videos.map((v) => <VideoCard key={v.id} v={v} muted={muted} onToggleMute={() => setMuted((m) => !m)} onLike={onLike} />)}
        {state === 'ready' && !cursor && videos.length > 0 && <div className="vcard empty"><h2>You've seen it all 🍲</h2><p>New dishes drop every day.</p><Link className="btn primary" to="/search">Find something specific</Link></div>}
      </main>
      <BottomNav dark />
    </div>
  );
}
