// Service Worker for Web Push Notifications
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  
  if (!event.data) {
    console.log('[Service Worker] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '새로운 분석 결과가 준비되었습니다.',
      icon: '/manus-logo.png',
      badge: '/manus-badge.png',
      tag: data.tag || 'export-import-notification',
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || '/',
        analysisId: data.analysisId,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'open',
          title: '확인',
          icon: '/icons/check.png',
        },
        {
          action: 'close',
          title: '닫기',
          icon: '/icons/close.png',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '수출입 동향 분석', options)
    );
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed');
});
