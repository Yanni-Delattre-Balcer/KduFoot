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
        // Check local storage for dismissal
        const dismissed = localStorage.getItem('kdufoot-pwa-dismissed') === 'true';
        setIsDismissed(dismissed);

        // Find if already installed
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMatch);

        // Detect iOS Safari (specifically not Chrome on iOS)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent) && !/chrome|crios/.test(userAgent);
        setIsIOS(ios);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User response to the install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            localStorage.setItem('kdufoot-pwa-dismissed', 'true');
            setIsDismissed(true);
        }

        setDeferredPrompt(null);
    };

    const dismissPrompt = () => {
        localStorage.setItem('kdufoot-pwa-dismissed', 'true');
        setIsDismissed(true);
    };

    return {
        deferredPrompt,
        isStandalone,
        isIOS,
        isDismissed,
        installPWA,
        dismissPrompt,
        canInstall: (!!deferredPrompt || (isIOS && !isStandalone)) && !isDismissed
    };
}
