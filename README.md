# FoodTalk web app

The customer app for FoodTalk: watch Lagos restaurants' food videos, order for delivery or pickup, and book tables.
One web app serves everyone: iPhone users add it to their Home Screen, and Android users get it from the Play Store (a Trusted Web Activity wrapper of this same site).

- React + Vite, no UI framework, system fonts (fast on mobile data). Only the feed loads up front; other pages load when opened.
- Installable (manifest + service worker). The service worker caches the app shell only, never API calls or payments.
- Talks to the backend set in `.env.production` (`VITE_API_BASE`).
- Live order updates over Socket.IO; optional push alerts via Firebase (`src/lib/push.js`).

```
npm install
npm run dev        # http://localhost:5180 (uses VITE_API_BASE or http://localhost:4000)
npm run build      # outputs dist/
```

**Going live:** follow [LAUNCH.md](LAUNCH.md).
