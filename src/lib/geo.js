// Remembers the customer's rough location (only after they tap "near me").
const KEY = 'ft_loc';
export const getLoc = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && Date.now() - v.at < 6 * 3600e3 ? v : null; } catch { return null; } };
export function askLoc() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Your browser can't share location"));
    navigator.geolocation.getCurrentPosition(
      (p) => { const v = { lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} resolve(v); },
      () => reject(new Error('Location is off. Turn it on to see food near you.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
}
export const locQuery = (loc = getLoc()) => (loc ? `lat=${loc.lat}&lng=${loc.lng}` : '');
