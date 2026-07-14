self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Event Received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Message', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 INCOMING CHAT REQUEST!';
  const options = {
    body: data.body || 'You have a new incoming consultation request on CallMint.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [500, 250, 500, 250, 500, 250, 500, 250, 500], // Simulates continuous phone ringing vibration
    tag: data.session_id ? `incoming-chat-${data.session_id}` : 'incoming-chat-generic',
    renotify: true,
    requireInteraction: true, // Keep the notification on-screen until user interacts with it
    data: {
      url: data.url || '/',
      session_id: data.session_id
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification Clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Try to find an existing open tab and focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Navigate if required or simply focus the dashboard
          if ('navigate' in client && client.url && !client.url.includes('/consultant')) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // 2. If no existing tab, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
