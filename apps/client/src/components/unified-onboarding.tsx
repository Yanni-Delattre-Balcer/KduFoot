import { useState, useEffect, useCallback } from "react";

import { useAuth, useUser } from "@/authentication";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { PwaInstallModal } from "@/modals/pwa-install-modal";
import { CombinedAuthModal } from "@/modals/combined-auth-modal";

export const UnifiedOnboarding = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: userLoading } = useUser();
  const {
    isStandalone,
    isPermanentlyDismissed,
    isSessionDismissed,
    canInstall,
  } = usePWAInstall();

  const [activeStep, setActiveStep] = useState<"pwa" | "auth" | null>(null);
  const [pwaStepEvaluated, setPwaStepEvaluated] = useState(false);

  // Reactive Storage States
  const [authDismissed, setAuthDismissed] = useState(false);

  const refreshDismissalState = useCallback(() => {
    const isPerm =
      localStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";
    const isSess =
      sessionStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";

    setAuthDismissed(isPerm || isSess);
  }, []);

  useEffect(() => {
    refreshDismissalState();
    window.addEventListener(
      "kdufoot_auth_step_complete",
      refreshDismissalState,
    );

    return () =>
      window.removeEventListener(
        "kdufoot_auth_step_complete",
        refreshDismissalState,
      );
  }, [refreshDismissalState]);

  useEffect(() => {
    if (authLoading || userLoading || !isAuthenticated) {
      return;
    }

    const isWeb = !isStandalone;

    // --- EVALUATION ---
    const needsPWA =
      isWeb && !isSessionDismissed && !isPermanentlyDismissed && canInstall;
    // La modale calendrier s'affiche tant que l'utilisateur n'a pas cliqué "Je l'ai déjà fait"
    // On ne vérifie PAS calendar_token car il est auto-généré côté serveur
    const needsAuth = !authDismissed;

    console.log("[Onboarding] Refreshing...", {
      activeStep,
      needsPWA,
      needsAuth,
      pwaStepEvaluated,
      isStandalone,
      detailed: {
        authDismissed,
        canInstall,
        isSessionDismissed,
        isPermanentlyDismissed,
        isStandalone,
      },
    });

    // --- STATE MACHINE ---

    // Step 1: PWA (only if needed and not yet evaluated)
    if (needsPWA && !pwaStepEvaluated) {
      if (activeStep !== "pwa") setActiveStep("pwa");
    }
    // Step 2: Auth (if needed AND no PWA is in the way)
    else if (needsAuth) {
      const pwaResolved = isStandalone || !needsPWA || pwaStepEvaluated;

      if (pwaResolved && activeStep !== "auth") {
        console.log("[Onboarding] Showing Auth/Calendar modal");
        setActiveStep("auth");
      }
    }
    // Cleanup
    else if (activeStep !== null) {
      // If we don't need PWA and we don't need Auth, close
      if (!needsPWA && !needsAuth) {
        setActiveStep(null);
      }
    }
  }, [
    isAuthenticated,
    authLoading,
    userLoading,
    isStandalone,
    isPermanentlyDismissed,
    isSessionDismissed,
    canInstall,
    pwaStepEvaluated,
    activeStep,
    authDismissed,
  ]);

  const handlePwaClose = (action: "installed" | "dismissed") => {
    console.log("[Onboarding] PWA Close Action:", action);
    // Marquer l'étape PWA comme terminée sans forcer activeStep à null.
    // Le useEffect réévaluera immédiatement et ouvrira l'étape "auth" (Calendrier).
    setPwaStepEvaluated(true);
  };

  const handleAuthClose = () => {
    console.log("[Onboarding] Auth Close (Je l'ai déjà fait)");
    setActiveStep(null);
    refreshDismissalState();
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <PwaInstallModal isOpen={activeStep === "pwa"} onClose={handlePwaClose} />
      <CombinedAuthModal
        isOpen={activeStep === "auth"}
        onClose={handleAuthClose}
      />
    </>
  );
};
