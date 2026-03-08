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
    const [isPermanentlyDismissed, setIsPermanentlyDismissed] = useState(false);
    const [isSessionDismissed, setIsSessionDismissed] = useState(false);

    useEffect(() => {
        // Check local storage for PERMANENT dismissal
        const permanentlyDismissed = localStorage.getItem('kdufoot-pwa-permanent-dismiss') === 'true';
        setIsPermanentlyDismissed(permanentlyDismissed);

        // Check session storage for SESSION dismissal (Plus tard)
        const sessionDismissed = sessionStorage.getItem('kdufoot-pwa-session-dismiss') === 'true';
        setIsSessionDismissed(sessionDismissed);

        // Find if already installed
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://')
            || localStorage.getItem('kdufoot-pwa-installed') === 'true';

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
            setIsStandalone(true);
            setIsPermanentlyDismissed(true);
        }

        setDeferredPrompt(null);
    };

    const dismissPrompt = (permanent: boolean) => {
        if (permanent) {
            localStorage.setItem('kdufoot-pwa-permanent-dismiss', 'true');
            setIsPermanentlyDismissed(true);
        } else {
            sessionStorage.setItem('kdufoot-pwa-session-dismiss', 'true');
            setIsSessionDismissed(true);
        }
    };

    return {
        deferredPrompt,
        isStandalone,
        isIOS,
        isPermanentlyDismissed,
        isSessionDismissed,
        installPWA,
        dismissPrompt,
        canInstall: (!!deferredPrompt || (isIOS && !isStandalone)) && !isPermanentlyDismissed && !isSessionDismissed && !isStandalone
    };
}
