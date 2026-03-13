/* eslint-disable no-undef */
// public/sw-push.js
// Handles push events in the background for KduFoot

self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();
        const { title, body, data } = payload;

        const options = {
            body: body || '',
            icon: '/android-chrome-192x192.png',
            badge: '/logo.png',
            data: data || {},
            vibrate: [100, 50, 100],
            actions: [
                { action: 'open', title: 'Ouvrir' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title || 'KduFoot', options)
        );
    } catch (e) {
        console.error('Error in push event:', e);
        // Fallback for plain text
        event.waitUntil(
            self.registration.showNotification('KduFoot', {
                body: event.data.text(),
                icon: '/android-chrome-192x192.png'
            })
        );
    }
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
