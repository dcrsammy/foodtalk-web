import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { cdn, km } from '../lib/format.js';
import { toast } from '../lib/toast.js';

// One full-screen video in the feed. Plays only while on screen; tap to pause, double-tap to like.
export default function VideoCard({ v, muted, onToggleMute, onLike }) {
  const ref = useRef(null), box = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [burst, setBurst] = useState(0);
  const { requireLogin } = useAuth();
  const nav = useNavigate();
  const lastTap = useRef(0), viewed = useRef(false);

  useEffect(() => {
    const el = box.current, vid = ref.current;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        if (!viewed.current) { viewed.current = true; api(`/videos/${v.id}/view`, { method: 'POST', auth: false }).catch(() => {}); }
      } else { vid.pause(); setPlaying(false); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(el); return () => io.disconnect();
  }, [v.id]);
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  async function like() {
    try { await requireLogin('Sign in to like and save food you love.'); } catch { return; }
    try { const r = await api(`/videos/${v.id}/like`, { method: 'POST' }); onLike(v.id, r); }
    catch (x) { toast(x.message); }
  }
  function tap(e) {
    const now = Date.now();
    if (now - lastTap.current < 300) { setBurst((b) => b + 1); if (!v.liked) like(); lastTap.current = 0; return; }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current !== now) return;
      const vid = ref.current; if (vid.paused) { vid.play(); setPlaying(true); } else { vid.pause(); setPlaying(false); }
    }, 280);
  }
  async function share() {
    const url = `${location.origin}/r/${v.vendor_id}?v=${v.id}`;
    try { if (navigator.share) await navigator.share({ title: v.business_name, text: v.caption || `Look at this from ${v.business_name} on FoodTalk`, url }); else { await navigator.clipboard.writeText(url); toast('Link copied'); } } catch {}
  }

  return (
    <section className="vcard" ref={box}>
      <video ref={ref} src={cdn(v.video_url)} poster={cdn(v.thumbnail_url, 'image')} loop playsInline muted={muted} preload="metadata" onClick={tap} />
      {!playing && <div className="paused" aria-hidden><span>▶</span></div>}
      {burst > 0 && <Icon key={burst} name="heart" size={110} className="likeburst" fill="#ff4d6d" />}
      <div className="vshade" />
      <div className="vinfo">
        <Link to={`/r/${v.vendor_id}`} className="vname">{v.business_name}</Link>
        <div className="vmeta">{[v.city, km(v.distance_km)].filter(Boolean).join(' · ')}</div>
        {v.caption && <p className="vcap">{v.caption}</p>}
        <div className="vactions">
          <button className="btn primary" onClick={() => nav(`/r/${v.vendor_id}`)}><Icon name="bag" size={18} /> Order</button>
          {v.offers_dine_in && <button className="btn glass" onClick={() => nav(`/book/${v.vendor_id}`)}><Icon name="table" size={18} /> Book a table</button>}
        </div>
      </div>
      <div className="vrail">
        <button onClick={like} aria-label={v.liked ? 'Unlike' : 'Like'} className={v.liked ? 'liked' : ''}><Icon name="heart" size={30} /><span>{v.likes_count || ''}</span></button>
        <button onClick={share} aria-label="Share"><Icon name="share" size={28} /><span>Share</span></button>
        <button onClick={onToggleMute} aria-label={muted ? 'Turn sound on' : 'Mute'}><Icon name={muted ? 'mute' : 'sound'} size={28} /></button>
      </div>
    </section>
  );
}
