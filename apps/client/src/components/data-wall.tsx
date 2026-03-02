import React from 'react';
import { Button } from "@heroui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@/authentication";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { Spinner } from "@heroui/spinner";

interface DataWallProps {
    message?: string;
}

export const DataWall: React.FC<DataWallProps> = ({ message: customMessage }) => {
    const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
    const { isLoading: isProfileLoading, isLocked, user, profileComplete } = useUser();
    const { isVisitor } = useWelcomeGateway();
    const location = useLocation();

    // ÉTAT A (Chargement Auth0) : Silence total pendant l'initialisation Auth0
    if (isAuthLoading) {
        return null;
    }

    // ÉTAT B (Visiteur Non Connecté) : Panneau de connexion avec 3 options
    if (!isAuthenticated) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-black/40 backdrop-blur-[6px] rounded-3xl">
                <div className="bg-content1 border border-default-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5 relative overflow-hidden">
                    <div className="p-4 rounded-full bg-primary-100/50 text-primary border border-primary-200 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                        Bienvenue sur KduFoot
                    </h2>

                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            onPress={() => login()}
                            className="bg-primary text-white font-black uppercase tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-primary/20"
                            size="lg"
                        >
                            Se connecter
                        </Button>

                        <Button
                            onPress={() => login({ authorizationParams: { screen_hint: 'signup' } })}
                            variant="bordered"
                            className="border-primary text-primary font-black uppercase tracking-tighter w-full rounded-2xl h-14 text-lg"
                            size="lg"
                        >
                            Créer un compte
                        </Button>

                        <div className="flex items-center gap-3 w-full my-1">
                            <div className="h-px bg-default-200 flex-1" />
                            <span className="text-[10px] font-bold text-default-400 uppercase tracking-widest">ou</span>
                            <div className="h-px bg-default-200 flex-1" />
                        </div>

                        <Button
                            onPress={() => login({ authorizationParams: { connection: 'google-oauth2' } })}
                            variant="flat"
                            className="bg-default-100 font-bold w-full rounded-2xl h-12 flex items-center justify-center gap-3"
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
                </div>
            </div>
        );
    }

    // ÉTAT A' (Chargement Profil) : Loader pendant que le profil se charge
    if (isProfileLoading) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-background/30 backdrop-blur-[2px] rounded-3xl">
                <div className="bg-content1 border border-default-200 shadow-lg rounded-full p-4 flex items-center gap-3">
                    <Spinner color="danger" size="sm" />
                    <span className="text-xs font-black uppercase tracking-tighter text-default-600 pr-2">Vérification de votre profil...</span>
                </div>
            </div>
        );
    }

    // ÉTAT C (Connecté mais Incomplet ou Visiteur avec Incomplet) : Alerte profil requis
    const { setVisitorMode } = useWelcomeGateway();
    const isProfileIncompleteVisitor = isVisitor && isAuthenticated && (!user || !profileComplete);

    if (isLocked || isProfileIncompleteVisitor) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-black/40 backdrop-blur-[6px] rounded-3xl">
                <div className="bg-content1 border border-default-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-6 relative overflow-hidden">
                    <div className="p-4 rounded-full bg-danger-100/50 text-danger border border-danger-200 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-xl font-bold text-foreground leading-snug">
                        {customMessage || "Pour débloquer l'accès aux données du site (matchs, tournois...), veuillez compléter votre profil Coach."}
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            as={Link}
                            to={`/account?from=${encodeURIComponent(location.pathname + location.search)}`}
                            className="bg-danger text-white font-black uppercase tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-danger/20"
                            size="lg"
                        >
                            Remplir mon profil Coach
                        </Button>

                        <Button
                            onPress={() => setVisitorMode()}
                            variant="flat"
                            className="text-default-500 font-bold uppercase tracking-widest text-xs h-10"
                        >
                            Visiter le site
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ÉTAT D (Connecté et Complet) : On ne retourne rien, contenu libre
    return null;
};

export default DataWall;
