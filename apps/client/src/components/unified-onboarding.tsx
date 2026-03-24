import { useState, useEffect } from "react";

import { useAuth, useUser } from "@/authentication";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { PwaInstallModal } from "@/modals/pwa-install-modal";
import { CombinedAuthModal } from "@/modals/combined-auth-modal";

export const UnifiedOnboarding = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: userLoading, needsCalendarReSync, updateUser } = useUser();

  const {
    isStandalone,
    isPermanentlyDismissed,
    isSessionDismissed,
    canInstall,
  } = usePWAInstall();

  const [activeStep, setActiveStep] = useState<"pwa" | "auth" | null>(null);
  const [pwaStepEvaluated, setPwaStepEvaluated] = useState(false);
  const [localAuthSuppressed, setLocalAuthSuppressed] = useState(
    sessionStorage.getItem("kdufoot-calendar-suppressed") === "true" ||
      localStorage.getItem("kdufoot-calendar-never-ask") === "true",
  );

  useEffect(() => {
    const handleStatusChange = () => {
      setLocalAuthSuppressed(
        sessionStorage.getItem("kdufoot-calendar-suppressed") === "true" ||
          localStorage.getItem("kdufoot-calendar-never-ask") === "true",
      );
    };

    window.addEventListener(
      "kdufoot_calendar_status_changed",
      handleStatusChange,
    );

    return () => {
      window.removeEventListener(
        "kdufoot_calendar_status_changed",
        handleStatusChange,
      );
    };
  }, []);

  useEffect(() => {
    if (authLoading || userLoading || !isAuthenticated) {
      return;
    }

    const isWeb = !isStandalone;

    // --- EVALUATION ---
    const needsPWA =
      isWeb && !isSessionDismissed && !isPermanentlyDismissed && canInstall;
    const needsAuth =
      needsCalendarReSync && !localAuthSuppressed && isAuthenticated;

    // --- STATE MACHINE ---
    // Log only when major states change or when evaluating after loads
    // Step 1: PWA (only if needed and not yet evaluated)
    if (needsPWA && !pwaStepEvaluated) {
      if (activeStep !== "pwa") setActiveStep("pwa");
    }
    // Step 2: Auth (if needed AND no PWA is in the way)
    else if (needsAuth) {
      const pwaResolved = isStandalone || !needsPWA || pwaStepEvaluated;

      if (pwaResolved && activeStep !== "auth") {
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
    needsCalendarReSync,
    localAuthSuppressed,
  ]);

  const handlePwaClose = (_action: "installed" | "dismissed") => {
    setPwaStepEvaluated(true);
  };

  const handleAuthClose = async (reason?: "permanent" | "never") => {
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
