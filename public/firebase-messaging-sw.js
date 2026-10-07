// Shows FoodTalk order updates as notifications when the app is in the background.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
const config = JSON.parse(new URL(location).searchParams.get('config') || '{}');
if (config.apiKey) {
  firebase.initializeApp(config);
  firebase.messaging();   // FCM displays notification payloads itself
}
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data?.FCM_MSG?.data?.order_id;
  e.waitUntil(clients.openWindow(id ? `/o/${id}` : '/me'));
});
