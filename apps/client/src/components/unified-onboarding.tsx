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
        // isStandalone is true if the app is launched from Home Screen (PWA)
        const isAppMode = isStandalone;
        const isWebMode = !isStandalone;

        // --- STEP 1: PWA (Installation) ---
        // We prompt for installation if in Web Mode (not standalone)
        // We only respect SESSION dismissal here to "verify all the time" on new site visits
        const needsPWA = isWebMode && !isSessionDismissed;
        
        // --- STEP 2: Auth (Notifications & Calendar) ---
        // For everyone if data is missing, but only after PWA if in Web mode
        const hasNotificationSupport = typeof Notification !== 'undefined';
        const notificationGranted = hasNotificationSupport ? Notification.permission === 'granted' : false;

        const needsAuth = (!user?.calendar_token || !notificationGranted) 
                         && !isAuthDismissedPermanent 
                         && !isAuthDismissedSession;

        console.log(`[Onboarding] Version Check: ${isAppMode ? 'PHONE/APP' : 'WEB'}`, {
            isStandalone,
            needsPWA,
            needsAuth,
            pwaStepEvaluated
        });

        // --- ORCHESTRATION ---

        // CASE A: User is on Web
        if (isWebMode) {
            if (needsPWA && !pwaStepEvaluated) {
                if (activeStep !== 'pwa') {
                    console.log("[Onboarding] Phase: PWA Request (Web)");
                    setActiveStep('pwa');
                }
            } else if (needsAuth && activeStep === null) {
                console.log("[Onboarding] Phase: Auth Request (Web post-PWA)");
                setActiveStep('auth');
            } else if (!needsPWA && !needsAuth && activeStep !== null) {
                setActiveStep(null);
            }
        } 
        
        // CASE B: User is on Phone (Standalone)
        else {
            if (needsAuth && activeStep === null) {
                console.log("[Onboarding] Phase: Auth Request (Phone/Standalone)");
                setActiveStep('auth');
            } else if (!needsAuth && activeStep !== null) {
                setActiveStep(null);
            }
        }

    }, [isAuthenticated, authLoading, userLoading, isStandalone, isPermanentlyDismissed, isSessionDismissed, user?.calendar_token, pwaStepEvaluated, canInstall]);

    const handlePwaClose = (action: 'installed' | 'dismissed') => {
        console.log("[Onboarding] PWA Modal closed with action:", action);
        setActiveStep(null);
        setPwaStepEvaluated(true); // Mark as done for this session to allow Auth step

        // Cascade transition ONLY if dismissed. 
        // If installed, we want them to open the app first.
        if (action === 'dismissed') {
            setTimeout(() => {
                const hasNotificationSupport = typeof Notification !== 'undefined';
                const notificationGranted = hasNotificationSupport ? Notification.permission === 'granted' : false;
                
                const needsAuth = (!user?.calendar_token || !notificationGranted) 
                                 && !isAuthDismissedPermanent 
                                 && !isAuthDismissedSession;
                
                if (needsAuth) {
                    console.log("[Onboarding] Cascade: Triggering Step 2: Auth");
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
