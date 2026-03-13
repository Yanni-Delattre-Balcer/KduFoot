/* eslint-disable no-undef */
// public/sw-push.js
// Handles push events in the background for KduFoot

self.addEventListener('push', (event) => {
    let payload = null;
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            console.warn('Push data is not JSON:', event.data.text());
        }
    }

    const title = payload?.title || 'Kdufoot';
    const body = payload?.body || (payload ? '' : 'Vous avez une nouvelle notification !');
    const data = payload?.data || { url: '/' };

    const options = {
        body,
        icon: '/android-chrome-192x192.png',
        badge: '/logo.png',
        data,
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'Ouvrir' }
        ],
        tag: 'kdufoot-notification', // Replace if same tag
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
