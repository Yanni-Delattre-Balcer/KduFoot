import { useEffect, useRef } from 'react';

/**
 * Hook to manage Web Push notification subscription.
 * - On non-iOS: auto-subscribe if permission is already granted
 * - On iOS: wait for the user to click the banner button (kdufoot_push_granted event)
 * - Sends the subscription to the backend for storage
 */
export function usePushNotifications(token?: string | null) {
    const subscribedRef = useRef(false);

    useEffect(() => {
        if (!token || subscribedRef.current) return;

        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            return;
        }

        // Skip if already subscribed in a previous session
        const alreadySubscribed = localStorage.getItem('kdufoot_push_subscribed');
        if (alreadySubscribed === 'true') {
            subscribedRef.current = true;
            return;
        }

        const doSubscribe = async () => {
            try {
                // Only proceed if permission is already granted
                if (Notification.permission !== 'granted') return;

                const registration = await navigator.serviceWorker.ready;

                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    const vapidPublicKey = import.meta.env.VAPID_PUBLIC_KEY;
                    if (!vapidPublicKey) return;

                    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
                    });
                }

                // Send subscription to backend
                const apiUrl = import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL || '';
                await fetch(`${apiUrl}/api/user/push-subscription`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(subscription.toJSON()),
                });

                localStorage.setItem('kdufoot_push_subscribed', 'true');
                subscribedRef.current = true;
            } catch (_e) {
                // Silently fail — push is optional
            }
        };

        // If permission is already granted (e.g., on Android after a previous grant), subscribe now
        if (Notification.permission === 'granted') {
            doSubscribe();
            return;
        }

        // On iOS, we can't auto-prompt. Instead, listen for the banner's custom event.
        // The PushNotificationBanner component dispatches this event when the user clicks "Activer".
        const handleGranted = () => {
            doSubscribe();
        };
        window.addEventListener('kdufoot_push_granted', handleGranted);

        return () => {
            window.removeEventListener('kdufoot_push_granted', handleGranted);
        };
    }, [token]);
}

/**
 * Convert a base64url string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
