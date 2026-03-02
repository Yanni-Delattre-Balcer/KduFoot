import React from 'react';
import { Button } from "@heroui/button";
import { Link, useLocation } from "react-router-dom";

interface DataWallProps {
    onCompleteProfile?: () => void;
    message?: string;
    isVisitor?: boolean;
    onLogin?: () => void;
}

export const DataWall: React.FC<DataWallProps> = ({ isVisitor, onLogin }) => {
    const location = useLocation();

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 animate-appearance-in bg-background/30 backdrop-blur-[2px] rounded-3xl">
            <div className="bg-content1 border border-default-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5 relative overflow-hidden">
                <div className="p-4 rounded-full bg-danger-50 text-danger animate-pulse border border-danger-100 mb-2">
                    {/* Cadenas icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                </div>

                {isVisitor ? (
                    <>
                        <p className="text-lg font-bold text-foreground leading-snug">
                            Veuillez vous connecter pour avoir accès à ces catégories.
                        </p>
                        <Button
                            onPress={onLogin}
                            className="bg-primary text-white font-bold w-full rounded-full"
                            size="lg"
                        >
                            Se connecter
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-bold text-foreground leading-snug">
                            Compléter votre profil d'entraîneur pour avoir accès à ces catégories.
                        </p>
                        <Button
                            as={Link}
                            to={`/account?from=${encodeURIComponent(location.pathname + location.search)}`}
                            className="bg-danger text-white font-bold w-full rounded-full"
                            size="lg"
                        >
                            Compléter mon profil
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DataWall;
