import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { lagosDay, naira, time12 } from '../lib/format.js';

const TIMES = []; for (let h = 11; h <= 22; h++) for (const m of [0, 30]) if (!(h === 22 && m === 30)) TIMES.push(`${String(h).padStart(2, '0')}:${m ? '30' : '00'}`);

export default function Book() {
  const { id } = useParams(); const nav = useNavigate();
  const { requireLogin } = useAuth();
  const [v, setV] = useState(null);
  const [date, setDate] = useState(lagosDay(0)); const [time, setTime] = useState(''); const [size, setSize] = useState(2);
  const [tables, setTables] = useState(null); const [table, setTable] = useState(''); const [fee, setFee] = useState(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api(`/vendors/${id}`, { auth: false }).then((d) => setV(d.vendor)).catch((x) => setErr(x.message)); }, [id]);
  const nowHHMM = new Date(Date.now() + 3600e3).toISOString().slice(11, 16);
  const times = TIMES.filter((t) => date !== lagosDay(0) || t > nowHHMM);
  useEffect(() => { if (time && !times.includes(time)) setTime(''); }, [date]); // eslint-disable-line
  useEffect(() => {
    setTables(null); setTable(''); setErr('');
    if (!time) return;
    api(`/reservations/availability?vendor_id=${id}&date=${date}&time=${time}&party_size=${size}`, { auth: false })
      .then((r) => { setTables(r.available_tables); setFee(r.reservation_fee); if (r.available_tables[0]) setTable(r.available_tables[0].id); })
      .catch((x) => { setTables([]); setErr(x.message); });
  }, [id, date, time, size]);

  async function book() {
    try { await requireLogin('Sign in to book. We\'ll send your confirmation.'); } catch { return; }
    setBusy(true); setErr('');
    try {
      const r = await api('/reservations', { method: 'POST', body: { vendor_id: id, table_id: table, party_size: size, reservation_date: date, reservation_time: time } });
      localStorage.setItem('ft_pending', JSON.stringify({ type: 'reservation', id: r.reservation.id }));
      location.href = r.authorization_url;
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  if (!v) return <div className="page center">{err ? <p className="err">{err}</p> : <div className="spinner dark" />}</div>;
  if (!v.offers_dine_in) return <div className="page"><p>{v.business_name} isn't taking table bookings on FoodTalk.</p></div>;

  return (
    <div className="page book">
      <div className="ptop"><button className="back" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button><h1 className="ptitle">Book a table</h1></div>
      <p className="from">at <b>{v.business_name}</b></p>
      <h3>How many people?</h3>
      <div className="stepper lg"><button onClick={() => setSize(Math.max(1, size - 1))} aria-label="Fewer"><Icon name="minus" /></button><b>{size}</b><button onClick={() => setSize(Math.min(30, size + 1))} aria-label="More"><Icon name="plus" /></button></div>
      <h3>Which day?</h3>
      <div className="hscroll">{Array.from({ length: 14 }, (_, i) => lagosDay(i)).map((d, i) => {
        const dt = new Date(d + 'T12:00:00Z');
        return <button key={d} className={'daychip' + (d === date ? ' on' : '')} onClick={() => setDate(d)}><small>{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : dt.toLocaleDateString('en-GB', { weekday: 'short' })}</small><b>{dt.getUTCDate()}</b><small>{dt.toLocaleDateString('en-GB', { month: 'short' })}</small></button>;
      })}</div>
      <h3>What time?</h3>
      <div className="timegrid">{times.map((t) => <button key={t} className={'chip' + (t === time ? ' on' : '')} onClick={() => setTime(t)}>{time12(t)}</button>)}{!times.length && <p className="muted">No more times today. Pick another day.</p>}</div>
      {time && (
        <>
          <h3>Pick a table</h3>
          {tables === null ? <div className="spinner dark" /> : tables.length === 0 ? <p className="muted">No table for {size} at {time12(time)}. Try another time.</p> :
            <div className="tables">{tables.map((t) => (
              <label key={t.id} className={'tablecard' + (t.id === table ? ' on' : '')}><input type="radio" name="table" checked={t.id === table} onChange={() => setTable(t.id)} />
                <b>{t.name}</b><span className="muted small">Seats {t.seat_count}{t.location_tag ? ` · ${t.location_tag}` : ''}</span></label>
            ))}</div>}
        </>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="paybar">
        <button className="btn primary block" disabled={!table || busy} onClick={book}>{busy ? 'Opening payment…' : fee ? `Pay ${naira(fee)} booking fee` : 'Choose a time'}</button>
        <p className="muted small center">The booking fee holds your table and isn't refunded if you cancel. If the restaurant cancels, you get it back.</p>
      </div>
    </div>
  );
}
