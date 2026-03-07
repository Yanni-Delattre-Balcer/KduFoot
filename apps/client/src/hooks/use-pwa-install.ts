import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check local storage for dismissal (7-day rule for non-intrusive UX)
        const dismissalTime = localStorage.getItem('kdufoot-pwa-dismissed-at');
        if (dismissalTime) {
            const dismissedAt = parseInt(dismissalTime, 10);
            const now = Date.now();
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

            if (now - dismissedAt < sevenDaysInMs) {
                setIsDismissed(true);
            } else {
                localStorage.removeItem('kdufoot-pwa-dismissed-at');
            }
        }

        // Find if already installed
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMatch);

        // Detect iOS Safari (specifically not Chrome/Firefox on iOS)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
        setIsIOS(ios);

        const handler = (e: Event) => {
            e.preventDefault();
            console.log('[PWA] beforeinstallprompt fired');
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem('kdufoot-pwa-installed', 'true');
            setIsDismissed(true);
        }

        setDeferredPrompt(null);
    };

    const dismissPrompt = () => {
        localStorage.setItem('kdufoot-pwa-dismissed-at', Date.now().toString());
        setIsDismissed(true);
    };

    return {
        deferredPrompt,
        isStandalone: isStandalone || localStorage.getItem('kdufoot-pwa-installed') === 'true',
        isIOS,
        isDismissed,
        installPWA,
        dismissPrompt,
        canInstall: (!!deferredPrompt || (isIOS && !isStandalone)) && !isDismissed
    };
}
