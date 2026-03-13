import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/authentication';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { PwaInstallModal } from '@/modals/pwa-install-modal';
import { CombinedAuthModal } from '@/modals/combined-auth-modal';

export const UnifiedOnboarding = () => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { user, isLoading: userLoading } = useUser();
    const { isStandalone, isPermanentlyDismissed, isSessionDismissed, canInstall } = usePWAInstall();

    const [activeStep, setActiveStep] = useState<'pwa' | 'auth' | null>(null);
    const [pwaStepEvaluated, setPwaStepEvaluated] = useState(false);

    // Persistence for Auth Step
    const isAuthDismissedPermanent = localStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";
    const isAuthDismissedSession = sessionStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";

    useEffect(() => {
        if (authLoading || userLoading || !isAuthenticated) return;

        // --- DETECT MODE ---
        const isAppMode = isStandalone;
        const isWebMode = !isStandalone;

        // --- STEP 1: PWA (Installation) ---
        const needsPWA = isWebMode && !isSessionDismissed;
        
        // --- STEP 2: Calendar Synchronization ---
        const needsAuth = !user?.calendar_token 
                         && !isAuthDismissedPermanent 
                         && !isAuthDismissedSession;

        console.log(`[Onboarding] Version Check: ${isAppMode ? 'PHONE/APP' : 'WEB'}`, {
            isStandalone,
            needsPWA,
            needsAuth,
            pwaStepEvaluated
        });

        // --- ORCHESTRATION ---

        if (isWebMode) {
            if (needsPWA && !pwaStepEvaluated) {
                if (activeStep !== 'pwa') {
                    console.log("[Onboarding] Phase: PWA Request (Web)");
                    setActiveStep('pwa');
                }
            } else if (needsAuth && activeStep === null) {
                console.log("[Onboarding] Phase: Calendar Sync Request (Web post-PWA)");
                setActiveStep('auth');
            } else if (!needsPWA && !needsAuth && activeStep !== null) {
                setActiveStep(null);
            }
        } 
        else {
            if (needsAuth && activeStep === null) {
                console.log("[Onboarding] Phase: Calendar Sync Request (Phone/Standalone)");
                setActiveStep('auth');
            } else if (!needsAuth && activeStep !== null) {
                setActiveStep(null);
            }
        }

    }, [isAuthenticated, authLoading, userLoading, isStandalone, isPermanentlyDismissed, isSessionDismissed, user?.calendar_token, pwaStepEvaluated, canInstall]);

    const handlePwaClose = (action: 'installed' | 'dismissed') => {
        console.log("[Onboarding] PWA Modal closed with action:", action);
        setActiveStep(null);
        setPwaStepEvaluated(true);

        if (action === 'dismissed') {
            setTimeout(() => {
                const needsAuth = !user?.calendar_token 
                                 && !isAuthDismissedPermanent 
                                 && !isAuthDismissedSession;
                
                if (needsAuth) {
                    console.log("[Onboarding] Cascade: Triggering Step 2: Calendar Sync");
                    setActiveStep('auth');
                }
            }, 600);
        } else {
            console.log("[Onboarding] User installed the app. Skipping cascade to allow relaunch.");
        }
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
