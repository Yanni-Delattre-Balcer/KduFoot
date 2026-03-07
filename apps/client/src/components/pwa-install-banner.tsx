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
        // React immediately to state changes (login, readiness)
        const readyToPrompt = !!deferredPrompt || (isIOS && !isStandalone);

        if (isAuthenticated && readyToPrompt && !isDismissed && !isStandalone) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [isAuthenticated, isStandalone, deferredPrompt, isIOS, isDismissed]);

    if (!isVisible || isStandalone || isDismissed) return null;

    const handleInstallClick = () => {
        if (isIOS) {
            setShowIOSHint(true);
        } else {
            installPWA();
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-appearance-in sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px]">
                    <div className="absolute inset-0 sm:hidden" onClick={handleDismiss} />
                    <Card className="bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden relative w-full">
                        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/50 to-primary" />

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
                            <div className="bg-black rounded-[2rem] p-4 border border-white/10 shadow-2xl relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <img src="/android-chrome-192x192.png" alt="Kdufoot" className="w-16 h-16 object-contain relative z-10" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">
                                    Installer <span className="text-primary italic">Kdufoot</span>
                                </h3>
                                <p className="text-sm text-zinc-400 font-medium px-4">
                                    Profitez d'une expérience fluide et de notifications en temps réel directement sur votre écran.
                                </p>
                            </div>

                            <div className="flex flex-col w-full gap-3 mt-2">
                                <Button
                                    size="lg"
                                    color="primary"
                                    className="font-black h-14 text-sm uppercase tracking-widest shadow-xl shadow-primary/20 w-full"
                                    onPress={handleInstallClick}
                                >
                                    INSTALLER L'APPLICATION
                                </Button>
                                <button
                                    onClick={handleDismiss}
                                    className="text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors py-2"
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
                    <Card className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-6 space-y-6 shadow-[0_0_100px_rgba(var(--heroui-primary-rgb),0.2)] relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-black border-2 border-primary/40 p-2 shadow-2xl shadow-primary/20 shadow-inner">
                                <img src="/apple-touch-icon.png" alt="Kdufoot" className="w-full h-full object-contain" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white tracking-tighter italic leading-tight">Kdufoot Mobile</h2>
                                <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Guide d'installation</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">1</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Connectez-vous sur <span className="text-white font-bold">Safari</span>.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">2</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Appuyez sur <span className="text-white font-bold">Options</span> (en bas à droite).</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">3</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">Puis sur <span className="text-blue-400 font-bold italic">Partager</span></p>
                                    <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">4</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Cliquez sur <span className="text-white font-bold">"En savoir plus"</span> (3e ligne).</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">5</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Trouvez <span className="text-white font-bold italic">"Sur l'écran d'accueil"</span>.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">6</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Sélectionnez-le puis faites <span className="text-white font-bold">"Ajouter"</span>.</p>
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
