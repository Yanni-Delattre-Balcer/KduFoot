import React, { useState } from 'react';
import { Button } from "@heroui/button";
import { useAuth, useUser } from "@/authentication";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { Spinner } from "@heroui/spinner";

interface DataWallProps {
    message?: string;
    children?: React.ReactNode;
}

export const DataWall: React.FC<DataWallProps> = ({ message: customMessage, children }) => {
    const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
    const { isLoading: isProfileLoading, profileComplete, setIsAccountModalOpen } = useUser();
    const { isVisitor, setVisitorMode } = useWelcomeGateway();
    const [dismissed, setDismissed] = useState(false);

    // ACCÈS TOTAL
    if (isAuthenticated && profileComplete) {
        return <>{children}</>;
    }

    // Chargement
    if (isAuthLoading) {
        return <>{children}</>;
    }

    if (isAuthenticated && isProfileLoading) {
        return (
            <div className="relative w-full min-h-[400px]">
                {children}
                <div className="absolute inset-0 z-30 backdrop-blur-xl bg-black/30 rounded-2xl flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Spinner color="white" size="sm" />
                        <span className="text-sm font-black tracking-tighter text-white/80">Vérification du profil...</span>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE VISITEUR NON-CONNECTÉ (a cliqué "Continuer comme visiteur")
    // ═══════════════════════════════════════════════════════════════
    if (!isAuthenticated && (dismissed || isVisitor)) {
        return (
            <div className="relative w-full">
                <div className="blur-[4px] pointer-events-none select-none opacity-50">
                    {children}
                </div>
                <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto bg-black/60 border border-white/10 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-md max-w-md">
                        <span className="text-lg">🔒</span>
                        <span className="text-sm font-bold text-white/70 leading-tight">
                            Connectez-vous pour accéder aux données.
                        </span>
                        <Button
                            onPress={() => login()}
                            size="sm"
                            className="bg-white/20 text-white font-bold text-xs sm:text-sm tracking-tight rounded-xl h-7 px-3 shrink-0 border border-white/10 hover:bg-white/30 transition-colors"
                        >
                            Connexion
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // RIDEAU DE VERRE — CAS 1 : NON CONNECTÉ
    // Mobile: message collé en haut. Desktop: centré.
    // ═══════════════════════════════════════════════════════════════
    if (!isAuthenticated) {
        return (
            <div className="relative w-full min-h-[500px]">
                <div className="invisible">
                    {children}
                </div>
                <div className="absolute inset-0 z-30 backdrop-blur-xl bg-black/50 rounded-2xl flex flex-col items-center justify-start pt-8 sm:justify-center sm:pt-0 px-6 py-6 sm:py-10">

                    <div className="p-3 sm:p-4 rounded-full bg-white/10 border border-white/20 mb-4 sm:mb-5 shadow-lg shadow-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 sm:w-10 h-8 sm:h-10 text-white/80">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>

                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white text-center leading-tight max-w-md tracking-tight mb-2">
                        Pour accéder à ces données, veuillez vous connecter à votre compte
                    </h2>

                    <p className="text-white/40 text-xs sm:text-sm font-medium mb-6 sm:mb-8 text-center">
                        Rejoignez la communauté KduFoot en quelques secondes.
                    </p>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <Button
                            onPress={() => login({ authorizationParams: { screen_hint: 'signup' } })}
                            className="bg-white text-black font-black tracking-tighter w-full rounded-2xl h-12 sm:h-13 text-sm sm:text-base shadow-2xl shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] transition-all"
                            size="lg"
                        >
                            S'inscrire
                        </Button>

                        <Button
                            onPress={() => login()}
                            variant="bordered"
                            className="border-2 border-white/40 text-white font-black tracking-tighter w-full rounded-2xl h-12 sm:h-13 text-sm sm:text-base hover:bg-white/10 transition-all"
                            size="lg"
                        >
                            Se connecter
                        </Button>

                        <div className="flex items-center gap-3 w-full my-1">
                            <div className="h-px bg-white/20 flex-1" />
                            <span className="text-xs sm:text-sm font-bold text-white/30 tracking-widest">ou</span>
                            <div className="h-px bg-white/20 flex-1" />
                        </div>

                        <Button
                            onPress={() => login({ authorizationParams: { connection: 'google-oauth2' } })}
                            variant="flat"
                            className="bg-white/10 border border-white/10 text-white font-bold w-full rounded-2xl h-11 flex items-center justify-center gap-3 hover:bg-white/15 transition-all text-xs sm:text-sm"
                            size="md"
                            startContent={
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            }
                        >
                            Continuer avec Google
                        </Button>
                    </div>

                    <Button
                        onPress={() => { setVisitorMode(); setDismissed(true); }}
                        variant="light"
                        className="mt-4 sm:mt-6 font-bold h-8 text-white/30 hover:text-white/60 transition-all uppercase tracking-widest text-xs sm:text-sm"
                    >
                        Continuer comme visiteur
                    </Button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // RIDEAU DE VERRE — CAS 2 : CONNECTÉ + PROFIL COACH INCOMPLET
    // Mobile: message collé en haut (visible sans scroll). Desktop: centré.
    // Pas de bouton "visiteur" — le message reste fixe.
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="relative w-full min-h-[500px]">
            <div className="blur-md pointer-events-none select-none opacity-40">
                {children}
            </div>
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-start pt-8 sm:justify-center sm:pt-0 px-6 py-6 sm:py-10">
                <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-10 max-w-sm w-full text-center flex flex-col items-center gap-4 sm:gap-5 shadow-2xl shadow-black/40">

                    <div className="p-3 sm:p-4 rounded-full bg-warning/20 border border-warning/30 shadow-lg shadow-warning/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 sm:w-10 h-8 sm:h-10 text-warning">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>

                    <h2 className="text-base sm:text-xl font-black text-white leading-snug tracking-tight">
                        {customMessage || "Complétez votre profil Coach pour accéder à ces données"}
                    </h2>

                    <p className="text-white/40 text-sm sm:text-xs font-medium leading-relaxed">
                        Renseignez votre Nom, Club, Téléphone, SIRET, etc. pour débloquer l'accès complet.
                    </p>

                    <Button
                        onPress={() => setIsAccountModalOpen(true)}
                        className="bg-warning text-white font-black uppercase tracking-tighter w-full rounded-2xl h-12 sm:h-13 text-sm sm:text-base shadow-2xl shadow-warning/20 hover:shadow-warning/30 hover:scale-[1.02] transition-all mt-1"
                        size="lg"
                    >
                        Remplir mon profil
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DataWall;
