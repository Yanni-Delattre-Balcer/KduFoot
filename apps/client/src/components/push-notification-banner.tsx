import { useState, useEffect } from 'react';
import { Button } from '@heroui/button';

/**
 * Banner component that prompts iOS users to enable push notifications.
 * On iOS (Safari/PWA), notification permission can only be requested
 * after a user gesture (button click), not on page load.
 *
 * This banner only shows when:
 * - The browser supports push notifications
 * - Permission has not yet been granted or denied
 * - The user hasn't already dismissed the banner
 */
export function PushNotificationBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Check if the browser supports notifications
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        // Don't show if already granted or explicitly denied
        if (Notification.permission !== 'default') {
            return;
        }

        // Don't show if user already dismissed
        if (localStorage.getItem('kdufoot_push_dismissed') === 'true') {
            return;
        }

        setVisible(true);
    }, []);

    const handleEnable = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Trigger the push subscription flow
                window.dispatchEvent(new CustomEvent('kdufoot_push_granted'));
            }
        } catch (_e) {
            // Silently fail
        }
        setVisible(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('kdufoot_push_dismissed', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-bounce-in">
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 flex items-center gap-3">
                <span className="text-2xl shrink-0">🔔</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">Recevoir les alertes sur mon tel</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Matchs acceptés, refusés, annulations...</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        size="sm"
                        variant="light"
                        className="text-zinc-400 min-w-0 px-2"
                        onPress={handleDismiss}
                        aria-label="Fermer le bandeau notifications"
                    >
                        ✕
                    </Button>
                    <Button
                        size="sm"
                        color="success"
                        variant="solid"
                        className="font-bold px-4"
                        onPress={handleEnable}
                        aria-label="Activer les notifications push"
                    >
                        Activer
                    </Button>
                </div>
            </div>
        </div>
    );
}
