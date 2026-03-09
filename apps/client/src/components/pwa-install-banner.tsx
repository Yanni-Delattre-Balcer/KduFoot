import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useAuth } from '@/authentication/providers/use-auth';

export const PwaInstallBanner = () => {
    const { deferredPrompt, isStandalone, isIOS, isPermanentlyDismissed, installPWA, dismissPrompt } = usePWAInstall();
    const { isAuthenticated, isLoading } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [showIOSHint, setShowIOSHint] = useState(false);
    const [showPCHint, setShowPCHint] = useState(false);

    // Lock background scroll when a hint is open
    useEffect(() => {
        if (showIOSHint || showPCHint) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showIOSHint, showPCHint]);

    useEffect(() => {
        // Strict visibility logic
        if (isLoading || !isAuthenticated || isStandalone || isPermanentlyDismissed) {
            setIsVisible(false);
            return;
        }

        // Show systematically if not standalone and not dismissed permanently
        setIsVisible(true);

    }, [isAuthenticated, isLoading, isStandalone, isPermanentlyDismissed]);

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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-appearance-in sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px]">
                    <div className="absolute inset-0 sm:hidden" onClick={handleDismissSession} />
                    <Card className="bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden relative w-full">
                        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/50 to-primary" />

                        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
                            <div className="bg-black rounded-[2rem] p-4 border border-white/10 shadow-2xl relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <img src="/android-chrome-192x192.png" alt="Kdufoot" className="w-16 h-16 object-contain relative z-10" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">
                                    Installer Kdufoot
                                </h3>
                                <p className="text-sm text-zinc-400 font-medium px-4">
                                    Installez l'application mobile pour une expérience fluide et des notifications sportives en temps réel.
                                </p>
                            </div>

                            <div className="flex flex-col w-full gap-2 mt-2">
                                <Button
                                    size="lg"
                                    color="primary"
                                    className="font-black h-12 text-sm uppercase tracking-widest shadow-xl shadow-primary/20 w-full"
                                    onPress={handleInstallClick}
                                >
                                    INSTALLER
                                </Button>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="font-bold text-[10px] uppercase tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                                        onPress={handleDismissSession}
                                    >
                                        PLUS TARD
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="font-bold text-[10px] uppercase tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                                        onPress={handleDismissPermanent}
                                    >
                                        JE L'AI DÉJÀ
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* iOS Specific Hint Popup */}
            {showIOSHint && (
                <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-appearance-in overflow-y-auto overscroll-contain" onClick={() => { setShowIOSHint(false); handleDismissSession(); }}>
                    <Card className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-6 space-y-6 shadow-[0_0_100px_rgba(var(--heroui-primary-rgb),0.2)] relative my-auto" onClick={e => e.stopPropagation()}>
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
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Ouvrez le site sur <span className="text-white font-bold">Safari</span>.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">2</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">Appuyez sur le bouton <span className="text-blue-400 font-bold italic">Partager</span></p>
                                    <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">3</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Faites défiler le menu vers le bas.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">4</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Cliquez sur <span className="text-white font-bold italic">"Sur l'écran d'accueil"</span>.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span className="text-primary font-black text-xs">5</span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium leading-relaxed">Sélectionnez-le puis faites <span className="text-white font-bold">"Ajouter"</span>.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button
                                color="primary"
                                className="w-full font-black uppercase tracking-widest h-12 text-sm shadow-xl shadow-primary/20"
                                onPress={() => { setShowIOSHint(false); handleDismissSession(); }}
                            >
                                C'EST COMPRIS !
                            </Button>
                            <Button
                                size="sm"
                                variant="flat"
                                className="font-bold text-[10px] uppercase tracking-tighter bg-zinc-800 text-zinc-400 hover:text-white"
                                onPress={handleDismissPermanent}
                            >
                                JE L'AI DÉJÀ INSTALLÉE
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* PC/Android General Hint Popup (If native prompt is blocked) */}
            {showPCHint && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-appearance-in" onClick={() => { setShowPCHint(false); handleDismissSession(); }}>
                    <Card className="bg-zinc-900 border-2 border-white/10 w-full max-w-sm p-8 space-y-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-4">
                            <h2 className="text-xl font-black text-white italic">Comment l'installer ?</h2>
                            <p className="text-sm text-zinc-400 font-medium">L'installation automatique est bloquée par votre navigateur actuel.</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                            <p className="text-sm text-zinc-300">
                                Pour installer Kdufoot, cliquez sur l'icône <span className="font-bold text-white">Installer l'application</span> (qui ressemble souvent à un écran d'ordinateur ou à un plus ➕) située <span className="text-primary font-bold">à tout moment à droite de votre barre d'adresse en haut de la fenêtre.</span>
                            </p>
                            <p className="text-sm text-zinc-300">
                                Sur Android Chrome, cherchez <span className="font-bold text-white">"Ajouter à l'écran d'accueil"</span> dans le menu du navigateur (les 3 petits points verticaux).
                            </p>
                        </div>

                        <Button
                            color="primary"
                            className="w-full font-black uppercase tracking-widest h-12 text-sm"
                            onPress={() => { setShowPCHint(false); handleDismissSession(); }}
                        >
                            J'AI COMPRIS
                        </Button>
                    </Card>
                </div>
            )}
        </>
    );
};
