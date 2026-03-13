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

        // --- STEP 1: PWA ---
        // We show it if: not standalone AND not dismissed
        const needsPWA = !isStandalone && !isPermanentlyDismissed && !isSessionDismissed;
        
        // --- STEP 2: Auth ---
        // We show it if: (Calendar or Push missing) AND not dismissed
        const needsAuth = (!user?.calendar_token || Notification.permission !== 'granted') 
                         && !isAuthDismissedPermanent 
                         && !isAuthDismissedSession;

        console.log("[Onboarding] Evaluating state:", {
            isStandalone,
            isPermanentlyDismissed,
            isSessionDismissed,
            canInstall,
            needsPWA,
            needsAuth,
            activeStep,
            pwaStepEvaluated
        });

        // PRIORITÉ STRICTE : Si PWA est nécessaire, on ne regarde RIEN d'autre tant qu'il n'est pas traité
        if (needsPWA && !pwaStepEvaluated) {
            if (activeStep !== 'pwa') {
                console.log("[Onboarding] Triggering Step 1: PWA");
                setActiveStep('pwa');
            }
            return;
        }

        // Si PWA n'est pas nécessaire OU déjà évalué (fermé), on check l'Auth
        if (needsAuth && activeStep === null) {
            console.log("[Onboarding] Step 1 skipped/done, checking Step 2...");
            setActiveStep('auth');
        } else if (!needsPWA && !needsAuth && activeStep !== null) {
            console.log("[Onboarding] Nothing needed, clearing steps");
            setActiveStep(null);
        }
    }, [isAuthenticated, authLoading, userLoading, isStandalone, isPermanentlyDismissed, isSessionDismissed, user?.calendar_token, pwaStepEvaluated]);

    const handlePwaClose = (completed: boolean) => {
        console.log("[Onboarding] PWA Modal closed, completed:", completed);
        setActiveStep(null);
        setPwaStepEvaluated(true); // Mark as done for this session to allow Auth step

        // Cascade transition with a delay for visual comfort
        setTimeout(() => {
            const needsAuth = (!user?.calendar_token || Notification.permission !== 'granted') 
                             && !isAuthDismissedPermanent 
                             && !isAuthDismissedSession;
            
            if (needsAuth) {
                console.log("[Onboarding] Cascade: Triggering Step 2: Auth");
                setActiveStep('auth');
            }
        }, 600);
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
