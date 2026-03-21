import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";

import { usePWAInstall } from "@/hooks/use-pwa-install";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: (action: "installed" | "dismissed") => void;
}

export const PwaInstallModal = ({ isOpen, onClose }: PwaInstallModalProps) => {
  const { deferredPrompt, isStandalone, isIOS, installPWA, dismissPrompt } =
    usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showPCHint, setShowPCHint] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSHint(true);
    } else if (deferredPrompt) {
      await installPWA();
      // The browser's native prompt will appear.
      // If they accept, we'll be in standalone mode eventually.
      // We notify orchestrator that user took the 'install' action.
      onClose("installed");
    } else {
      setShowPCHint(true);
    }
  };

  const handleDismissSession = () => {
    dismissPrompt(false);
    onClose("dismissed");
  };

  const handleDismissPermanent = () => {
    dismissPrompt(true);
    onClose("dismissed");
  };

  // Auto-close overlay if installed elsewhere
  useEffect(() => {
    if (isStandalone && isOpen) {
      onClose("installed");
    }
  }, [isStandalone, isOpen]);

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      classNames={{
        base: "bg-transparent shadow-none border-none",
        wrapper: "z-[10000]",
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      isOpen={isOpen}
      size="md"
      aria-labelledby="pwa-modal-title"
      onClose={() => onClose("dismissed")}
    >
      <ModalContent>
        <ModalBody className="p-0">
          {/* Standard Install Content */}
          {!showIOSHint && !showPCHint && (
            <Card className="bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden relative w-full">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/50 to-primary" />
              <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
                <div className="bg-black rounded-[2rem] p-4 border border-white/10 shadow-2xl relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img
                    alt="Kdufoot"
                    className="w-16 h-16 object-contain relative z-10"
                    src="/android-chrome-192x192.png"
                  />
                </div>

                <div className="space-y-2">
                  <h3 id="pwa-modal-title" className="text-2xl font-black text-white tracking-tighter italic leading-none">
                    Installer Kdufoot
                  </h3>
                  <p className="text-sm text-zinc-400 font-medium px-4">
                    Installez l'application mobile pour une expérience fluide et
                    des notifications sportives en temps réel.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-2 mt-2">
                  <Button
                    className="font-black h-12 text-sm tracking-widest shadow-xl shadow-primary/20 w-full"
                    color="primary"
                    size="lg"
                    onPress={handleInstallClick}
                  >
                    Installer
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="font-bold text-[10px] tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                      size="sm"
                      variant="flat"
                      onPress={handleDismissSession}
                    >
                      Plus tard
                    </Button>
                    <Button
                      className="font-bold text-[10px] tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                      size="sm"
                      variant="flat"
                      onPress={handleDismissPermanent}
                    >
                      Je l'ai déjà
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* iOS Specific Hint */}
          {showIOSHint && (
            <Card className="bg-zinc-900 border-2 border-white/10 w-full p-6 space-y-6 shadow-[0_0_100px_rgba(var(--heroui-primary-rgb),0.2)]">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-black border-2 border-primary/40 p-2 shadow-2xl shadow-primary/20">
                  <img
                    alt="Kdufoot"
                    className="w-full h-full object-contain"
                    src="/apple-touch-icon.png"
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tighter italic leading-tight">
                    Installer KduFoot sur votre iPhone
                  </h2>
                  <p className="text-[10px] text-primary font-black tracking-[0.2em]">
                    Guide d'installation Safari
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Étape 1 */}
                <div className="flex items-start gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                      Ouvrez le site sur{" "}
                      <span className="text-blue-400 font-bold italic">Safari</span>{" "}
                      et cliquez sur les trois petits points{" "}
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500/20 rounded-lg border border-blue-500/30 text-blue-400 font-bold text-[10px]">⋯</span>{" "}
                      ou l'icône de partage en bas de votre écran.
                    </p>
                  </div>
                </div>

                {/* Étape 2 */}
                <div className="flex items-start gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                      Dans le menu qui s'ouvre, appuyez sur{" "}
                      <span className="text-white font-bold italic">Partager</span>
                    </p>
                    <div className="bg-blue-500/20 p-1 rounded-lg border border-blue-500/30">
                      <svg
                        className="w-4 h-4 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Étape 3 */}
                <div className="flex items-start gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">3</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    Faites défiler les options vers le bas et cliquez sur{" "}
                    <span className="text-white font-bold italic">En voir plus</span>{" "}
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-zinc-700/50 rounded border border-white/10 text-zinc-300 font-bold text-[10px]">⌄</span>
                  </p>
                </div>

                {/* Étape 4 */}
                <div className="flex items-start gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">4</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    Cherchez et cliquez sur{" "}
                    <span className="text-white font-bold italic">Sur l'écran d'accueil</span>{" "}
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500/20 rounded border border-emerald-500/30 text-emerald-400 font-bold text-sm">⊕</span>
                  </p>
                </div>

                {/* Étape 5 */}
                <div className="flex items-start gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">5</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    Enfin, appuyez sur{" "}
                    <span className="text-blue-400 font-bold italic">Ajouter</span>{" "}
                    en haut à droite.
                  </p>
                </div>

                {/* Résultat */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mt-2">
                  <p className="text-xs text-emerald-400 font-bold text-center leading-relaxed">
                    ✨ L'application est maintenant installée sur votre téléphone comme une app classique !
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full font-black tracking-widest h-12 text-sm shadow-xl shadow-primary/20"
                  color="primary"
                  onPress={() => {
                    setShowIOSHint(false);
                    handleDismissSession();
                  }}
                >
                  C'est compris !
                </Button>
                <Button
                  className="font-bold text-[10px] tracking-tighter bg-zinc-800 text-zinc-400"
                  size="sm"
                  variant="flat"
                  onPress={handleDismissPermanent}
                >
                  JE L'AI DÉJÀ INSTALLÉE
                </Button>
              </div>
            </Card>
          )}

          {/* PC Hint */}
          {showPCHint && (
            <Card className="bg-zinc-900 border-2 border-white/10 w-full p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-4">
                <h2 className="text-xl font-black text-white italic">
                  Installation manuelle
                </h2>
                <p className="text-sm text-zinc-400">
                  Cliquez sur l'icône{" "}
                  <span className="text-primary font-bold">Installer</span> dans
                  votre barre d'adresse ou dans le menu de votre navigateur.
                </p>
              </div>
              <Button
                className="w-full font-black tracking-widest h-12 text-sm"
                color="primary"
                onPress={() => {
                  setShowPCHint(false);
                  handleDismissSession();
                }}
              >
                J'ai compris
              </Button>
            </Card>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
