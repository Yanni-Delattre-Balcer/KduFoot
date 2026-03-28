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
  onClose: (reason?: "permanent" | "never") => void;
}

export const CombinedAuthModal: React.FC<CombinedAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);

  const isAndroid = /android/i.test(navigator.userAgent);

  const handleCalendarSync = async () => {
    setIsSyncing(true);

    try {
      const data = await api.get<{ url: string }>(
        "/api/users/me/calendar-link",
        getAccessTokenSilently,
      );

      if (data && data.url) {
        const rawUrl = data.url;

        if (isAndroid) {
          // Android: Use Google Calendar subscription URL which triggers the app chooser
          const httpsUrl = rawUrl.replace(/^webcal:\/\//, "https://");
          const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`;

          window.open(googleCalUrl, "_blank");
        } else {
          // iOS / Desktop: webcal:// works natively
          const webcalUrl = rawUrl.replace(/^https?:\/\//, "webcal://");

          window.location.href = webcalUrl;
        }
      }
    } catch (error) {
      console.error("[Calendar] Failed to fetch calendar link:", error);
      addToast({
        title: t(
          "onboarding.calendar.toast_error",
          "Échec de la synchronisation",
        ),
        color: "danger",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismissRefused = () => {
    // C'est le SEUL moyen de fermer définitivement la modale (via la DB)
    onClose("permanent");
  };

  const handleNeverAskAgain = () => {
    // Ne plus demander au démarrage (flag local)
    onClose("never");
  };

  return (
    <Modal
      aria-labelledby="auth-modal-title"
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
          <div className="p-4 rounded-[2.5rem] bg-linear-to-br from-purple-500/30 to-indigo-500/20 text-purple-300 border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
            <Calendar size={36} strokeWidth={2} />
          </div>
        </ModalHeader>
        <ModalBody className="text-center px-6 sm:px-10">
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-b from-white to-white/60 tracking-tight leading-tight"
            id="auth-modal-title"
          >
            {t("onboarding.calendar.title", "Synchronisez votre calendrier")}
          </h2>
          <p className="mt-2 text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed max-w-[280px] sm:max-w-none mx-auto opacity-80">
            {t(
              "onboarding.calendar.description",
              "Ne manquez aucun match ! Synchronisez vos rencontres avec l'application calendrier de votre téléphone.",
            )}
          </p>

          <div className="flex justify-center w-full mt-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl group-hover:bg-purple-500/30 transition-colors rounded-full" />
              <div className="relative flex flex-col items-center gap-3 p-5 sm:p-7 rounded-[2.5rem] bg-white/3 backdrop-blur-md border border-white/10 w-full min-w-[140px] sm:min-w-[180px] hover:border-white/20 transition-all duration-300">
                <div className="absolute inset-x-8 -bottom-4 h-20 bg-emerald-500/10 blur-2xl rounded-full" />
                <Calendar
                  className="text-purple-400 group-hover:scale-110 transition-transform duration-500"
                  size={32}
                />
                <span className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em] mt-1">
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
              className="bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold tracking-tight w-full rounded-2xl h-14 text-base sm:text-lg shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              endContent={!isSyncing && <ChevronRight size={20} />}
              isLoading={isSyncing}
              size="lg"
              onPress={handleCalendarSync}
            >
              {t("onboarding.calendar.button")}
            </Button>

            {/* Bouton de confirmation : fermeture définitive */}
            <Button
              className="w-full font-bold text-sm tracking-tight rounded-xl h-12 border-2 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-all"
              variant="flat"
              onPress={handleDismissRefused}
            >
              {t("onboarding.calendar.dismiss", "Je l'ai déjà fait")}
            </Button>

            {/* Bouton "Pas maintenant" : fermeture pour la session actuelle */}
            <Button
              className="text-zinc-500 hover:text-white font-semibold text-[10px] tracking-wider mt-2"
              size="sm"
              variant="light"
              onPress={() => onClose()}
            >
              {t("onboarding.calendar.later", "Peut-être plus tard")}
            </Button>

            {/* Bouton "Ne plus me demander" : fermeture définitive pour cet appareil */}
            <Button
              className="text-zinc-400 hover:text-zinc-400 font-medium text-[9px] tracking-widest leading-none mt-1"
              size="sm"
              variant="light"
              onPress={handleNeverAskAgain}
            >
              {t("onboarding.calendar.never_ask", "Ne plus me demander")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
