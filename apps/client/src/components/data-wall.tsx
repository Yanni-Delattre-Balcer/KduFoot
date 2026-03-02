import React from 'react';
import { Button } from "@heroui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@/authentication";
import { Spinner } from "@heroui/spinner";

interface DataWallProps {
    message?: string;
}

export const DataWall: React.FC<DataWallProps> = ({ message: customMessage }) => {
    const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
    const { isLoading: isProfileLoading, isLocked } = useUser();
    const location = useLocation();

    // 1. Auth0 Loading : Silence total pendant l'initialisation Auth0 pour éviter les flashs
    if (isAuthLoading) {
        return null;
    }

    // 2. Non Connecté : Bouton de connexion directe (Point 2 de la demande)
    if (!isAuthenticated) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-black/40 backdrop-blur-[4px] rounded-3xl">
                <div className="bg-content1 border border-default-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-6 relative overflow-hidden">
                    <div className="p-4 rounded-full bg-primary-100/50 text-primary border border-primary-200 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-xl font-bold text-foreground leading-snug">
                        Vous devez vous connecter à un compte pour avoir accès à ces informations.
                    </p>
                    <Button
                        onPress={() => login()}
                        className="bg-primary text-white font-black uppercase tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-primary/20"
                        size="lg"
                    >
                        Se connecter à un compte
                    </Button>
                </div>
            </div>
        );
    }

    // 3. Authentifié mais Profil en cours de chargement : Loader strict (Point 3 de la demande)
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

    // 4. Profil Incomplet : Cadenas (Point 3 de la demande)
    if (isLocked) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-black/40 backdrop-blur-[4px] rounded-3xl">
                <div className="bg-content1 border border-default-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-6 relative overflow-hidden">
                    <div className="p-4 rounded-full bg-danger-100/50 text-danger border border-danger-200 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-xl font-bold text-foreground leading-snug">
                        {customMessage || "Veuillez remplir vos informations de coach pour avoir accès à ces informations-là."}
                    </p>
                    <Button
                        as={Link}
                        to={`/account?from=${encodeURIComponent(location.pathname + location.search)}`}
                        className="bg-danger text-white font-black uppercase tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-danger/20"
                        size="lg"
                    >
                        Compléter mon profil
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};

export default DataWall;
