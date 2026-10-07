// FoodTalk service worker: makes the app installable and opens instantly on repeat visits.
// It caches the app shell only. API calls, videos and payments always go to the network.
const SHELL = 'foodtalk-shell-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png']))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;            // API, Paystack, Cloudinary: untouched
  if (req.mode === 'navigate') {                                                   // pages: network first, cached shell if offline
    e.respondWith(fetch(req).then((r) => { caches.open(SHELL).then((c) => c.put('/', r.clone())); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) { // hashed files: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); return r; })));
  }
});
