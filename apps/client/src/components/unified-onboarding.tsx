import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/authentication';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { PwaInstallModal } from '@/modals/pwa-install-modal';
import { CombinedAuthModal } from '@/modals/combined-auth-modal';

export const UnifiedOnboarding = () => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { user, isLoading: userLoading } = useUser();
    const { isStandalone, isPermanentlyDismissed, isSessionDismissed } = usePWAInstall();

    const [activeStep, setActiveStep] = useState<'pwa' | 'auth' | null>(null);

    // Persistence for Auth Step
    const isAuthDismissedPermanent = localStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";
    const isAuthDismissedSession = sessionStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";

    useEffect(() => {
        if (authLoading || userLoading || !isAuthenticated) return;

        // Check if Step 1 (PWA) is needed
        const needsPWA = !isStandalone && !isPermanentlyDismissed && !isSessionDismissed;
        
        // Check if Step 2 (Auth) is needed
        // - No calendar token
        // - OR Notifications not granted (and not permanently dismissed)
        const needsAuth = (!user?.calendar_token || Notification.permission !== 'granted') 
                         && !isAuthDismissedPermanent 
                         && !isAuthDismissedSession;

        if (needsPWA) {
            setActiveStep('pwa');
        } else if (needsAuth) {
            setActiveStep('auth');
        } else {
            setActiveStep(null);
        }
    }, [isAuthenticated, authLoading, userLoading, isStandalone, isPermanentlyDismissed, isSessionDismissed, user?.calendar_token]);

    const handlePwaClose = (completed: boolean) => {
        setActiveStep(null);
        console.log("[Onboarding] PWA Step closed, completed:", completed);

        // Cascade to Auth step after a short delay
        setTimeout(() => {
            const needsAuth = (!user?.calendar_token || Notification.permission !== 'granted') 
                             && !isAuthDismissedPermanent 
                             && !isAuthDismissedSession;
            
            if (needsAuth) {
                console.log("[Onboarding] Cascading to Auth Step...");
                setActiveStep('auth');
            }
        }, 800);
    };

    const handleAuthClose = () => {
        setActiveStep(null);
        console.log("[Onboarding] Auth Step closed");
    };

    if (!isAuthenticated) return null;

    return (
        <>
            <PwaInstallModal 
                isOpen={activeStep === 'pwa'} 
                onClose={handlePwaClose} 
            />
            <CombinedAuthModal 
                isOpen={activeStep === 'auth'} 
                onClose={handleAuthClose} 
            />
        </>
    );
};
