// Web push for order updates through Firebase Cloud Messaging (the backend already sends FCM).
// Works on Android Chrome, and on iPhone once FoodTalk is added to the home screen (iOS 16.4+).
// Needs VITE_FIREBASE_CONFIG (the web app config JSON from Firebase) and VITE_FIREBASE_VAPID_KEY.
import { api } from './api.js';

export async function enablePush() {
  const cfg = import.meta.env.VITE_FIREBASE_CONFIG, vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!cfg || !vapidKey || !('serviceWorker' in navigator) || !('Notification' in window)) return false;
  if (Notification.permission === 'denied') return false;
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
  const config = JSON.parse(cfg);
  const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js'),
  ]);
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${encodeURIComponent(cfg)}`, { scope: '/firebase-cloud-messaging-push-scope' });
  const token = await getToken(getMessaging(initializeApp(config)), { vapidKey, serviceWorkerRegistration: reg });
  if (token) await api('/customers/me/push-token', { method: 'PATCH', body: { push_token: token } });
  return Boolean(token);
}
