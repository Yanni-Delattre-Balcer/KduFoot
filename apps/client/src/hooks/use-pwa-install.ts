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

        // Check session storage for SESSION dismissal
        const sessionDismissed = sessionStorage.getItem('kdufoot-pwa-session-dismiss') === 'true';
        setIsSessionDismissed(sessionDismissed);

        // Find if already installed (strictly detected by the browser/OS)
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');
 
        setIsStandalone(isStandaloneMatch);

        // Detect iOS Safari (specifically not Chrome/Firefox on iOS)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
        setIsIOS(ios);

        // Quick check if the event already fired before React mounted
        if ((window as any).deferredPWAInstallPrompt) {
            setDeferredPrompt((window as any).deferredPWAInstallPrompt);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            (window as any).deferredPWAInstallPrompt = e;
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Sync dismissal across tabs (Only local storage since session is tab-specific, 
        // but here we might want all tabs of same session to hide it)
        const storageHandler = (e: StorageEvent) => {
            if (e.key === 'kdufoot-pwa-permanent-dismiss') {
                setIsPermanentlyDismissed(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem('kdufoot-pwa-installed', 'true');
            setIsStandalone(true);
            setIsPermanentlyDismissed(true);
            window.dispatchEvent(new CustomEvent('kdufoot_pwa_step_complete'));
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
        window.dispatchEvent(new CustomEvent('kdufoot_pwa_step_complete'));
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
