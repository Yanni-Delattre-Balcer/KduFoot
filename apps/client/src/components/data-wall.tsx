import React from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

interface DataWallProps {
    onCompleteProfile: () => void;
    message?: string;
    isVisitor?: boolean;
    onLogin?: () => void;
}

export const DataWall: React.FC<DataWallProps> = ({ onCompleteProfile, message, isVisitor, onLogin }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-10 px-4 animate-appearance-in w-full">
            <Card className="max-w-2xl w-full border-2 border-warning/30 bg-[#232120] shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-warning/10 to-transparent pointer-events-none"></div>
                <CardBody className="relative py-12 px-8 flex flex-col items-center gap-8 text-center">
                    <div className="p-6 rounded-full bg-warning/20 text-warning-500 animate-pulse ring-8 ring-warning/5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-20 h-20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-warning-500 uppercase tracking-tighter leading-none">
                            {isVisitor ? "Connexion Requise" : "Accès Restreint"}
                        </h2>
                        <p className="text-lg text-default-600 font-bold leading-relaxed max-w-lg mx-auto">
                            {isVisitor ? (
                                "Veuillez vous connecter pour créer un match, un tournoi ou accéder aux recherches détaillées."
                            ) : (
                                message || (
                                    <>
                                        Les informations de votre compte ne sont pas remplies. Vous n'avez pas accès à ces informations tant que votre fiche <span className="text-warning-600">MON COMPTE</span> n'est pas 100% complétée.
                                    </>
                                )
                            )}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
                        {isVisitor ? (
                            <Button
                                color="primary"
                                size="lg"
                                className="font-black uppercase tracking-widest shadow-xl shadow-primary/20 px-10"
                                onPress={onLogin}
                            >
                                Se connecter
                            </Button>
                        ) : (
                            <Button
                                color="warning"
                                size="lg"
                                className="font-black uppercase tracking-widest shadow-xl shadow-warning/20 px-10"
                                onPress={onCompleteProfile}
                            >
                                Compléter mon profil
                            </Button>
                        )}
                    </div>

                    <p className="text-xs text-default-400 font-medium uppercase tracking-[0.2em] opacity-50">
                        Kdufoot • Plateforme de mise en relation certifiée
                    </p>
                </CardBody>
            </Card>
        </div>
    );
};

export default DataWall;
