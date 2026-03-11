import { useEffect, useRef } from 'react';

/**
 * Hook to manage Web Push notification subscription.
 * - Request notification permission on first visit
 * - Subscribe to the push service using the VAPID public key
 * - Send the subscription to the backend for storage
 */
export function usePushNotifications(token?: string | null) {
    const subscribedRef = useRef(false);

    useEffect(() => {
        // Only run once, when authenticated and not already subscribed
        if (!token || subscribedRef.current) return;

        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            return;
        }

        // Skip if already subscribed in this session
        const alreadySubscribed = localStorage.getItem('kdufoot_push_subscribed');
        if (alreadySubscribed === 'true') {
            subscribedRef.current = true;
            return;
        }

        async function subscribeToPush() {
            try {
                // Request notification permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    return;
                }

                // Wait for the service worker to be ready
                const registration = await navigator.serviceWorker.ready;

                // Check if already subscribed
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    // Convert VAPID public key from base64url to Uint8Array
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

                // Mark as subscribed to avoid re-prompting
                localStorage.setItem('kdufoot_push_subscribed', 'true');
                subscribedRef.current = true;
            } catch (_e) {
                // Silently fail — push is optional
            }
        }

        subscribeToPush();
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
