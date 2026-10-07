export const naira = (n) => '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG');
export const km = (d) => (d == null ? '' : d < 1 ? `${Math.round(d * 1000)} m away` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km away`);
export const lagosTime = (iso) => new Date(iso).toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit', hour12: true });
export const lagosDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short' });
export const time12 = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
/** Today in Lagos as YYYY-MM-DD, plus n days */
export const lagosDay = (n = 0) => new Date(Date.now() + 3600e3 + n * 864e5).toISOString().slice(0, 10);
export const directions = (v) => v.latitude && v.longitude
  ? `https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.business_name || ''} ${v.address || ''} Lagos`)}`;
/** Smaller, phone-friendly Cloudinary video/image (auto quality and format). Leaves other URLs alone. */
export const cdn = (url, kind = 'video') => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const t = kind === 'video' ? 'q_auto,vc_auto,w_720' : 'q_auto,f_auto,w_480';
  return url.replace('/upload/', `/upload/${t}/`);
};
