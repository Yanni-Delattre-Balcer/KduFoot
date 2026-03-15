import { useState, useEffect, useCallback } from "react";

import { useAuth, useUser } from "@/authentication";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { PwaInstallModal } from "@/modals/pwa-install-modal";
import { CombinedAuthModal } from "@/modals/combined-auth-modal";

export const UnifiedOnboarding = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    isLoading: userLoading,
    needsCalendarReSync,
    updateUser,
  } = useUser();

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
  const [localAuthSuppressed, setLocalAuthSuppressed] = useState(
    sessionStorage.getItem("kdufoot-calendar-suppressed") === "true" ||
    localStorage.getItem("kdufoot-calendar-never-ask") === "true",
  );

  const refreshDismissalState = useCallback(() => {
    const isPerm =
      localStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";
    const isSess =
      sessionStorage.getItem("kdufoot-auth-onboarding-dismissed") === "true";

    setAuthDismissed(isPerm || isSess);
  }, []);

  useEffect(() => {
    refreshDismissalState();
    const handleStatusChange = () => {
      setLocalAuthSuppressed(
        sessionStorage.getItem("kdufoot-calendar-suppressed") === "true" ||
        localStorage.getItem("kdufoot-calendar-never-ask") === "true"
      );
    };

    window.addEventListener(
      "kdufoot_auth_step_complete",
      refreshDismissalState,
    );
    window.addEventListener(
      "kdufoot_calendar_status_changed",
      handleStatusChange,
    );

    return () => {
      window.removeEventListener(
        "kdufoot_auth_step_complete",
        refreshDismissalState,
      );
      window.removeEventListener(
        "kdufoot_calendar_status_changed",
        handleStatusChange,
      );
    };
  }, [refreshDismissalState]);

  useEffect(() => {
    if (authLoading || userLoading || !isAuthenticated) {
      return;
    }

    const isWeb = !isStandalone;

    // --- EVALUATION ---
    const needsPWA =
      isWeb && !isSessionDismissed && !isPermanentlyDismissed && canInstall;
    const needsAuth = needsCalendarReSync && !localAuthSuppressed && isAuthenticated;

    console.log("[Onboarding] Refreshing...", {
      activeStep,
      needsPWA,
      needsAuth,
      pwaStepEvaluated,
      isStandalone,
      detailed: {
        authDismissed,
        localAuthSuppressed,
        canInstall,
        isSessionDismissed,
        isPermanentlyDismissed,
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
    needsCalendarReSync,
    localAuthSuppressed,
  ]);

  const handlePwaClose = (action: "installed" | "dismissed") => {
    console.log("[Onboarding] PWA Close Action:", action);
    setPwaStepEvaluated(true);
  };

  const handleAuthClose = async (reason?: "permanent" | "never") => {
    console.log("[Onboarding] Auth Close. Reason:", reason);
    if (reason === "permanent") {
      // Persistent dismissal in database (legacy)
      try {
        await updateUser({ has_synced_calendar: true });
      } catch (e) {
        console.error("Failed to persist calendar dismissal", e);
      }
    } else if (reason === "never") {
      // "Ne plus me demander" : Local storage persistent
      localStorage.setItem("kdufoot-calendar-never-ask", "true");
      setLocalAuthSuppressed(true);
    } else {
      // "Pas maintenant" : Session storage
      sessionStorage.setItem("kdufoot-calendar-suppressed", "true");
      setLocalAuthSuppressed(true);
    }
    setActiveStep(null);
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
