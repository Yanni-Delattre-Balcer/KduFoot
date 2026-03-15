import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Calendar, ChevronRight } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { addToast } from "@heroui/toast";
import { useTranslation } from "react-i18next";

import { api } from "@/services/api";

interface CombinedAuthModalProps {
  isOpen: boolean;
  onClose: (isPermanent?: boolean) => void;
}

export const CombinedAuthModal: React.FC<CombinedAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);

  const handleCalendarSync = async () => {
    setIsSyncing(true);
    console.log("[Calendar] Starting manual synchronization...");

    try {
      console.log("[Calendar] Fetching sync link...");
      const data = await api.get(
        "/api/users/me/calendar-link",
        getAccessTokenSilently,
      );

      if (data && (data as any).url) {
        const finalUrl = (data as any).url.replace(/^https?:\/\//, "webcal://");

        console.log(
          "[Calendar] Redirecting to universal webcal link:",
          finalUrl,
        );
        // Ouvrir le lien webcal:// qui déclenche le sélecteur natif
        // iOS → "S'abonner au calendrier ?"
        // Android → "Ouvrir avec... Google Calendar / Outlook / etc."
        window.location.href = finalUrl;
        setHasSyncedOnce(true);
        addToast({
          title: t("onboarding.calendar.toast_success", "Lien calendrier ouvert !"),
          description: t("onboarding.calendar.toast_success_desc", "Acceptez l'abonnement dans votre application calendrier, puis cliquez sur « Je l'ai déjà fait »."),
          color: "success",
        });
      }
    } catch (error) {
      console.error("[Calendar] Failed to fetch calendar link:", error);
      addToast({
        title: t("onboarding.calendar.toast_error", "Échec de la synchronisation"),
        color: "danger",
      });
    } finally {
      setIsSyncing(false);
      // NE PAS fermer la modale ici.
      // L'utilisateur doit d'abord accepter l'abonnement dans son app calendrier
      // puis cliquer sur "Je l'ai déjà fait" pour confirmer et fermer.
    }
  };

  const handleDismissRefused = () => {
    // C'est le SEUL moyen de fermer définitivement la modale (via la DB)
    onClose(true);
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        base: "bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden",
        header: "border-none pt-8",
        body: "flex flex-col gap-6 px-8 pb-8",
        footer: "border-none pb-8 pt-0 px-8 flex flex-col gap-3",
        closeButton: "hidden",
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      isOpen={isOpen}
      size="md"
      onClose={() => {}} // Empêcher la fermeture par défaut
    >
      <ModalContent>
        <ModalHeader className="flex justify-center flex-col items-center gap-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-500/10 blur-[80px] -z-10 rounded-full" />
          <div className="p-4 rounded-[2.5rem] bg-gradient-to-br from-purple-500/30 to-indigo-500/20 text-purple-300 border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
            <Calendar size={36} strokeWidth={2} />
          </div>
        </ModalHeader>
        <ModalBody className="text-center px-6 sm:px-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight leading-tight">
            {t("onboarding.calendar.title", "Synchronisez votre calendrier")}
          </h1>
          <p className="mt-2 text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed max-w-[280px] sm:max-w-none mx-auto opacity-80">
            {t("onboarding.calendar.description", "Ne manquez aucun match ! Synchronisez vos rencontres avec l'application calendrier de votre téléphone.")}
          </p>

          <div className="flex justify-center w-full mt-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl group-hover:bg-purple-500/30 transition-colors rounded-full" />
              <div className="relative flex flex-col items-center gap-3 p-5 sm:p-7 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-md border border-white/10 w-full min-w-[140px] sm:min-w-[180px] hover:border-white/20 transition-all duration-300">
                <Calendar
                  className="text-purple-400 group-hover:scale-110 transition-transform duration-500"
                  size={32}
                />
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">
                  {t("onboarding.calendar.native", "Calendrier natif")}
                </span>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="px-6 sm:px-10 pb-10">
            <div className="flex flex-col gap-4 w-full">
              {/* Bouton principal : ouvre le lien webcal:// */}
              <Button
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold tracking-tight w-full rounded-2xl h-14 text-base sm:text-lg shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                endContent={!isSyncing && <ChevronRight size={20} />}
                isLoading={isSyncing}
                size="lg"
                onPress={handleCalendarSync}
              >
                {t("onboarding.calendar.button", "Synchroniser mon calendrier")}
              </Button>

              {/* Bouton de confirmation : seul moyen de fermer la modale */}
              <Button
                className="w-full font-bold text-sm tracking-tight rounded-xl h-12 border-2 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-all"
                variant="flat"
                onPress={handleDismissRefused}
              >
                {t("onboarding.calendar.dismiss")}
              </Button>

              {hasSyncedOnce && (
                <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  Après avoir accepté l'abonnement dans votre application calendrier, cliquez sur « Je l'ai déjà fait » ci-dessus.
                </p>
              )}

              {/* Bouton "Pas maintenant" : ferme pour cette session uniquement */}
              <button
                className="text-zinc-500 hover:text-zinc-300 font-semibold text-[10px] transition-colors py-2 uppercase tracking-wider"
                onClick={() => {
                  // sessionStorage.setItem("kdufoot-auth-onboarding-dismissed", "true");
                  // window.dispatchEvent(new CustomEvent("kdufoot_auth_step_complete"));
                  onClose();
                }}
              >
                Pas maintenant
              </button>
            </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
