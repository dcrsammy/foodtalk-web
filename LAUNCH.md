# FoodTalk launch guide

FoodTalk runs as one web app for everyone:
- **iPhone:** customers open the link in Safari and tap *Share → Add to Home Screen*.
- **Android:** the same web app, wrapped for the Play Store.

| Part | Repo | Where it runs | Address |
|---|---|---|---|
| Customer web app | `foodtalk-web` | Cloudflare Pages | https://foodtalk.city-pulse.live |
| Restaurant dashboard | `foodtalk-vendor-dashboard` | Cloudflare Pages | https://vendors.foodtalk.city-pulse.live |
| Admin panel | `foodtalk-admin-panel` | Cloudflare Pages | https://admin.foodtalk.city-pulse.live |
| Backend + database | `foodtalk-backend` | Railway (already live) | https://web-production-af9e1.up.railway.app |

---

## 1. Railway variables (backend)

In Railway, open the backend service, go to **Variables**, and add or check these:

| Variable | Value | Why |
|---|---|---|
| `JWT_SECRET` | long random text (40+ characters) | Signs logins. **The server now refuses to start without it.** |
| `PAYSTACK_CALLBACK_URL` | `https://foodtalk.city-pulse.live/paid` | Where Paystack sends customers after paying |
| `TERMII_API_KEY` | from termii.com → API settings | Sends login codes by SMS |
| `TERMII_SENDER_ID` | `FoodTalk` (register it in Termii) | Name shown on the SMS |
| `TERMII_CHANNEL` | `generic` until Termii approves the sender ID, then `dnd` | `dnd` also reaches numbers on Do-Not-Disturb |
| `RESERVATION_FEE` | `2000` (optional) | Table booking fee in naira |

**Testing before SMS is funded:** set `ALLOW_DEV_OTP=true`. The sign-in screen will then show the code on screen. This lets anyone sign in as any number, so **delete it before real customers use the app.**

The server updates the database itself every time it starts. You don't need to run migrations by hand any more.

**Paystack dashboard:** go to Settings → API Keys & Webhooks and set the webhook URL to:
`https://web-production-af9e1.up.railway.app/webhooks/paystack`

## 2. Connect the real addresses (city-pulse.live)

city-pulse.live's DNS is managed by **Netlify**, so CityPulse stays exactly where it is. FoodTalk goes on three subdomains served by **Cloudflare Pages**. Pages is used rather than Workers because Workers can only use a custom domain when the whole domain's DNS is on Cloudflare; Pages works with a plain CNAME.

For each repo, create a Pages project. In Cloudflare, go to **Workers & Pages → Create**, click the small *"Looking to deploy Pages? Get started"* link, then **Import an existing Git repository**:

| Repo | Build command | Output directory | Custom domain |
|---|---|---|---|
| `foodtalk-web` | `npm run build` | `dist` | `foodtalk.city-pulse.live` |
| `foodtalk-vendor-dashboard` | `npm run build` | `dist` | `vendors.foodtalk.city-pulse.live` |
| `foodtalk-admin-panel` | `npm run build` | `dist` | `admin.foodtalk.city-pulse.live` |

Then do these in order for each project:
1. Once it deploys, open the project's **Custom domains** tab, choose **Set up a custom domain**, and enter the address. Cloudflare then shows a CNAME target (the project's `*.pages.dev` address).
2. In **Netlify → Domains → city-pulse.live → DNS settings → Add new record**, add a CNAME with the name `foodtalk`, `vendors.foodtalk` or `admin.foodtalk`, pointing to that `*.pages.dev` address.
3. Back in Cloudflare, wait for the domain to show **Active**. This usually takes 5–30 minutes, and HTTPS is added automatically.

After that:
- **Railway:** set `PAYSTACK_CALLBACK_URL` = `https://foodtalk.city-pulse.live/paid`.
- **Old `*.workers.dev` sites:** delete them in Cloudflare once the new addresses work.

## 3. Android: Play Store (under the CityPulse developer account)

1. Open **https://www.pwabuilder.com**, enter `https://foodtalk.city-pulse.live`, and choose **Package for stores → Android**.
2. Set the package ID to `live.citypulse.foodtalk`, the app name to `FoodTalk`, and keep the signing option as *create new*. Download the zip.
3. **Keep the signing key file and passwords from the zip somewhere safe.** You need them for every future update.
4. In Play Console, choose **Create app → FoodTalk**, then upload the `.aab` from the zip to *Internal testing*.
5. In Play Console, open **Test and release → App integrity → App signing** and copy the **SHA-256 certificate fingerprint**.
6. Put that fingerprint into `public/.well-known/assetlinks.json` (replacing `REPLACE_WITH_SHA256…`) and redeploy. Without it, the app shows a browser address bar at the top.
7. If the developer account is a **personal** account created after November 2023, Google requires a closed test with **12 testers for 14 days** before going public. Start it early.

App updates need no store review. Push to `foodtalk-web` and both the Android app and the iPhone home-screen app update.

## 4. Order and booking alerts on phones (optional, recommended)

The backend already sends Firebase alerts. To turn them on for the web app:
1. In the Firebase console (project `foodtalk-ca624`), open **Project settings → General → Your apps**, add a **Web app**, and copy its config.
2. In **Cloud Messaging → Web Push certificates**, generate a key pair and copy the key.
3. In the `foodtalk-web` Cloudflare project, add two environment variables, then redeploy:
   - `VITE_FIREBASE_CONFIG` = the config, pasted as one line of JSON
   - `VITE_FIREBASE_VAPID_KEY` = the key from step 2

On iPhone, alerts only work after FoodTalk is added to the Home Screen (iOS 16.4+). While the order page is open, it updates live either way.

## 5. Before the first real order

- [ ] `ALLOW_DEV_OTP` removed and a Termii SMS received on your own phone
- [ ] One restaurant approved in the admin panel. Approval creates its Paystack subaccount.
- [ ] One real ₦100 test order paid with your own card, accepted in the restaurant dashboard, and refunded by rejecting it
- [ ] Android app opens without an address bar (proof that assetlinks is correct)

## How the money works

- **The customer pays** the food price plus FoodTalk's service fee. The fee is the restaurant's commission rate, 15% by default, and you can change it per restaurant in the admin panel.
- **Paystack splits each payment as it happens.** The restaurant gets the food price and FoodTalk keeps the fee. Paystack's own charge comes out of FoodTalk's share.
- **Refunds are automatic** when the customer cancels before the restaurant accepts, or when the restaurant rejects the order.
- **Booking fees** (₦2,000) are split the same way. They're not refunded if the customer cancels, and are refunded if the restaurant cancels.
- **Promo codes** come in two kinds:
  - A restaurant's own code takes money off the food price, so the restaurant pays for it.
  - A FoodTalk-wide code takes money off the service fee, so FoodTalk pays for it.
