import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { useTranslation } from "react-i18next";

import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useAuth } from "@/authentication/providers/use-auth";

export const PwaInstallBanner = () => {
  const { t } = useTranslation();
  const {
    deferredPrompt,
    isStandalone,
    isIOS,
    isPermanentlyDismissed,
    isSessionDismissed,
    installPWA,
    dismissPrompt,
  } = usePWAInstall();
  const { isAuthenticated, isLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showPCHint, setShowPCHint] = useState(false);

  // Lock background scroll when a hint is open
  useEffect(() => {
    if (showIOSHint || showPCHint) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showIOSHint, showPCHint]);

  useEffect(() => {
    // Strict visibility logic:
    // - Don't show while loading or if not authenticated
    // - Don't show if already installed (standalone)
    // - Don't show if permanently dismissed ("Je l'ai déjà")
    // - Don't show if session-dismissed ("Plus tard") — resets on next login
    if (
      isLoading ||
      !isAuthenticated ||
      isStandalone ||
      isPermanentlyDismissed ||
      isSessionDismissed
    ) {
      setIsVisible(false);

      return;
    }

    // Show only when authenticated and not dismissed in any way
    setIsVisible(true);
  }, [
    isAuthenticated,
    isLoading,
    isStandalone,
    isPermanentlyDismissed,
    isSessionDismissed,
  ]);

  if (!isVisible) return null;

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSHint(true);
    } else if (deferredPrompt) {
      installPWA();
    } else {
      // Unlikely to happen normally but covers Chrome heuristic cooldowns
      setShowPCHint(true);
    }
  };

  const handleDismissSession = () => {
    dismissPrompt(false);
    setIsVisible(false);
  };

  const handleDismissPermanent = () => {
    dismissPrompt(true);
    setIsVisible(false);
  };

  return (
    <>
      {/* Standard Install Banner (Android/PC) */}
      {!showIOSHint && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-appearance-in sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px]">
          <div
            className="absolute inset-0 sm:hidden"
            role="button"
            tabIndex={0}
            onClick={handleDismissSession}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleDismissSession();
              }
            }}
          />
          <Card className="bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden relative w-full">
            <div className="h-1.5 w-full bg-linear-to-r from-primary via-primary/50 to-primary" />

            <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
              <div className="bg-black rounded-4xl p-4 border border-white/10 shadow-2xl relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img
                  alt="Kdufoot"
                  className="w-16 h-16 object-contain relative z-10"
                  src="/android-chrome-192x192.png"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tighter italic leading-none">
                  {t("pwa.install_title")}
                </h3>
                <p className="text-sm text-zinc-400 font-medium px-4">
                  {t("pwa.install_desc")}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 mt-2">
                <Button
                  className="font-black h-12 text-sm tracking-widest shadow-xl shadow-primary/20 w-full"
                  color="primary"
                  size="lg"
                  onPress={handleInstallClick}
                >
                  {t("pwa.install")}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="font-bold text-[10px] tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                    size="sm"
                    variant="flat"
                    onPress={handleDismissSession}
                  >
                    {t("pwa.later")}
                  </Button>
                  <Button
                    className="font-bold text-[10px] tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                    size="sm"
                    variant="flat"
                    onPress={handleDismissPermanent}
                  >
                    {t("pwa.already_have_it")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* iOS Specific Hint Popup */}
      {showIOSHint && (
        <div
          className="fixed inset-0 z-10000 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-appearance-in overflow-y-auto overscroll-contain"
          role="button"
          tabIndex={0}
          onClick={() => {
            setShowIOSHint(false);
            handleDismissSession();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowIOSHint(false);
              handleDismissSession();
            }
          }}
        >
          <Card
            className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-6 space-y-6 shadow-[0_0_100px_rgba(var(--heroui-primary-rgb),0.2)] relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                  Kdufoot Mobile
                </h2>
                <p className="text-[10px] text-primary font-black tracking-[0.2em]">
                  {t("pwa.ios_guide_subtitle")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-black text-xs">1</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  {t("pwa.ios_step1")}{" "}
                  <span className="text-white font-bold">Safari</span>.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-black text-xs">1</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    {t("pwa.ios_step2_pre")}{" "}
                    <span className="text-blue-400 font-bold italic">
                      {t("pwa.ios_step2_bold")}
                    </span>{" "}
                    {t("pwa.ios_step2_suf")}
                  </p>
                  <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30">
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

              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-black text-xs">2</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  {t("pwa.ios_step3_pre")}{" "}
                  <span className="text-white font-bold italic">
                    {t("pwa.ios_step3_bold")}
                  </span>
                  {t("pwa.ios_step3_suf")}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-black text-xs">3</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  {t("pwa.ios_step4_pre")}{" "}
                  <span className="text-white font-bold italic">
                    {t("pwa.ios_step4_bold")}
                  </span>{" "}
                  {t("pwa.ios_step4_suf")}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-black text-xs">4</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  {t("pwa.ios_step5_pre")}{" "}
                  <span className="text-white font-bold">
                    {t("pwa.ios_step5_bold")}
                  </span>{" "}
                  {t("pwa.ios_step5_suf")}
                </p>
              </div>

              <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 mt-2">
                <p className="text-[10px] text-green-400 font-bold text-center leading-tight">
                  {t("pwa.ios_success")}
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
                {t("pwa.understood")}
              </Button>
              <Button
                className="font-bold text-[10px] uppercase tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                size="sm"
                variant="flat"
                onPress={handleDismissPermanent}
              >
                {t("pwa.already_installed")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* PC/Android General Hint Popup (If native prompt is blocked) */}
      {showPCHint && (
        <div
          className="fixed inset-0 z-10000 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-appearance-in"
          role="button"
          tabIndex={0}
          onClick={() => {
            setShowPCHint(false);
            handleDismissSession();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowPCHint(false);
              handleDismissSession();
            }
          }}
        >
          <Card
            className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-8 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <h2 className="text-xl font-black text-white italic">
                {t("pwa.pc_title")}
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                {t("pwa.pc_blocked")}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
              <p className="text-sm text-zinc-300">
                {t("pwa.pc_instruction_pre")}{" "}
                <span className="font-bold text-white">
                  {t("pwa.pc_instruction_bold")}
                </span>{" "}
                {t("pwa.pc_instruction_mid")}{" "}
                <span className="text-primary font-bold">
                  {t("pwa.pc_instruction_loc")}
                </span>
              </p>
              <p className="text-sm text-zinc-300">
                {t("pwa.pc_android_pre")}{" "}
                <span className="font-bold text-white">
                  {t("pwa.pc_android_bold")}
                </span>{" "}
                {t("pwa.pc_android_suf")}
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
              {t("pwa.got_it")}
            </Button>
          </Card>
        </div>
      )}
    </>
  );
};
