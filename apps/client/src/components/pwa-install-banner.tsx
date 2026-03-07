import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useAuth0 } from '@auth0/auth0-react';

export const PwaInstallBanner = () => {
    const { deferredPrompt, isStandalone, isIOS, installPWA } = usePWAInstall();
    const { isAuthenticated } = useAuth0();
    const [isVisible, setIsVisible] = useState(false);
    const [showIOSHint, setShowIOSHint] = useState(false);

    useEffect(() => {
        // Show banner only for authenticated users who haven't installed yet
        if (isAuthenticated && !isStandalone) {
            // Delay showing to not overwhelm immediately
            const timer = setTimeout(() => {
                if (deferredPrompt) {
                    setIsVisible(true);
                } else if (isIOS) {
                    setIsVisible(true);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, isStandalone, deferredPrompt, isIOS]);

    if (!isVisible || isStandalone) return null;

    const handleInstallClick = () => {
        if (isIOS) {
            setShowIOSHint(true);
        } else {
            installPWA();
            setIsVisible(false);
        }
    };

    return (
        <>
            {/* Standard Install Banner (Android/PC) */}
            {!showIOSHint && (
                <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-appearance-in sm:bottom-6 sm:left-auto sm:right-6 sm:w-96">
                    <Card className="bg-zinc-900/90 backdrop-blur-xl border-2 border-primary/20 shadow-2xl p-4 sm:p-5 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <div className="flex items-center gap-4">
                            <div className="bg-black rounded-xl p-2 border border-white/10 shadow-inner">
                                <img src="/android-chrome-192x192.png" alt="KDUFOOT" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Installer KDUFOOT</h3>
                                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                                    Ajoutez l'app sur votre écran pour une expérience foot 100% immersive.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    size="sm"
                                    color="primary"
                                    className="font-black h-8 text-[10px] min-w-0 px-4"
                                    onPress={handleInstallClick}
                                >
                                    INSTALLER
                                </Button>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="text-[10px] font-bold text-zinc-500 uppercase hover:text-white transition-colors"
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
                <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-appearance-in" onClick={() => setShowIOSHint(false)}>
                    <Card className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black border-2 border-primary/30 p-2 shadow-lg shadow-primary/10">
                                <img src="/apple-touch-icon.png" alt="KDUFOOT" className="w-full h-full object-contain" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">KDUFOOT sur iPhone</h2>
                                <p className="text-xs text-zinc-400 font-medium">Installez l'application en deux clics :</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="bg-white/10 rounded-full p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                                    </svg>
                                </div>
                                <p className="text-xs text-zinc-200">1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="bg-white/10 rounded-full p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>
                                <p className="text-xs text-zinc-200">2. Sélectionnez <strong>Sur l'écran d'accueil</strong> dans la liste.</p>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            className="w-full font-black uppercase tracking-widest h-12"
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
