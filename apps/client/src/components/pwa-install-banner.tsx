import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useAuth0 } from '@auth0/auth0-react';

export const PwaInstallBanner = () => {
    const { deferredPrompt, isStandalone, isIOS, isDismissed, installPWA, dismissPrompt } = usePWAInstall();
    const { isAuthenticated } = useAuth0();
    const [isVisible, setIsVisible] = useState(false);
    const [showIOSHint, setShowIOSHint] = useState(false);

    useEffect(() => {
        // Show banner only for authenticated users who haven't installed yet and haven't dismissed
        if (isAuthenticated && !isStandalone && !isDismissed) {
            // Speed up the display for "one-click" experience
            const timer = setTimeout(() => {
                if (deferredPrompt || isIOS) {
                    setIsVisible(true);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, isStandalone, deferredPrompt, isIOS, isDismissed]);

    if (!isVisible || isStandalone || isDismissed) return null;

    const handleInstallClick = () => {
        if (isIOS) {
            setShowIOSHint(true);
        } else {
            installPWA();
            // isDismissed will be set to true if they accept
        }
    };

    const handleDismiss = () => {
        dismissPrompt();
        setIsVisible(false);
    };

    return (
        <>
            {/* Standard Install Banner (Android/PC) */}
            {!showIOSHint && (
                <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-appearance-in sm:bottom-6 sm:left-auto sm:right-6 sm:w-96">
                    <Card className="bg-zinc-900/95 backdrop-blur-2xl border-2 border-primary/30 shadow-2xl p-4 sm:p-5 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary shadow-[0_0_15px_rgba(var(--heroui-primary-rgb),0.5)]" />
                        <div className="flex items-center gap-4">
                            <div className="bg-black rounded-xl p-2 border border-white/10 shadow-inner shrink-0 shadow-primary/5">
                                <img src="/android-chrome-192x192.png" alt="KDUFOOT" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">Installer l'application</h3>
                                <p className="text-[10px] text-zinc-400 font-medium leading-tight">
                                    Accédez à KDUFOOT d'un simple clic sur votre écran d'accueil.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    color="primary"
                                    className="font-black h-9 text-[11px] min-w-[100px] px-4 shadow-lg shadow-primary/20"
                                    onPress={handleInstallClick}
                                >
                                    INSTALLER
                                </Button>
                                <button
                                    onClick={handleDismiss}
                                    className="text-[10px] font-bold text-zinc-500 uppercase hover:text-white transition-colors py-1"
                                >
                                    Plus tard
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* iOS Specific Hint Popup */}
            {showIOSHint && (
                <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-appearance-in" onClick={() => setShowIOSHint(false)}>
                    <Card className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-6 space-y-7 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-black border-2 border-primary/40 p-2 shadow-2xl shadow-primary/20">
                                <img src="/apple-touch-icon.png" alt="KDUFOOT" className="w-full h-full object-contain" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">KDUFOOT Mobile</h2>
                                <p className="text-xs text-primary font-bold uppercase tracking-widest">Installer l'application en 2 secondes</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group transition-all">
                                <div className="bg-blue-500/10 rounded-2xl p-3 border border-blue-500/20 group-hover:bg-blue-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-100 leading-tight">1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group transition-all">
                                <div className="bg-green-500/10 rounded-2xl p-3 border border-green-500/20 group-hover:bg-green-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-green-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-100 leading-tight">2. Sélectionnez <strong>Sur l'écran d'accueil</strong> dans la liste.</p>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            className="w-full font-black uppercase tracking-widest h-14 text-sm shadow-xl shadow-primary/20"
                            onPress={() => setShowIOSHint(false)}
                        >
                            C'EST COMPRIS !
                        </Button>
                    </Card>
                </div>
            )}
        </>
    );
};
