/**
 * Kdufoot Push Notification Service Worker
 * This file handles incoming push messages and notification clicks.
 * It is loaded alongside the Workbox-generated SW via importScripts.
 */

// Listen for push events from the Web Push server
self.addEventListener('push', function(event) {
    console.log("Notification reçue !", event.data ? event.data.text() : "Pas de payload");
    let data = { title: 'Kdufoot', body: '', icon: '/logo.png', url: '/dashboard' };

    if (event.data) {
        try {
            const payload = event.data.json();
            data = {
                title: payload.title || 'Kdufoot',
                body: payload.body || '',
                icon: payload.icon || '/logo.png',
                url: payload.url || '/dashboard',
            };
        } catch (e) {
            // If JSON parsing fails, use the text as body
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: '/android-chrome-192x192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url },
        actions: [
            { action: 'open', title: 'Ouvrir' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click — open the app at the relevant page
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const url = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If a tab is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
