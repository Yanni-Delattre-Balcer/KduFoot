import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { useAuth, useUser } from "@/authentication";
import { useNavigate } from "react-router-dom";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { buttonGradient } from "./primitives";

export const WelcomeGateway: React.FC = () => {
    const { login, isAuthenticated } = useAuth();
    const { profileComplete, isLoading: isUserLoading } = useUser();
    const navigate = useNavigate();
    const { isOpen, closeGateway, setVisitorMode, clearVisitorMode, blockingMessage } = useWelcomeGateway();

    // Silent startup: if profile is 100% complete and no specific blocking message, close and don't show
    React.useEffect(() => {
        if (isAuthenticated && !isUserLoading && profileComplete && !blockingMessage && isOpen) {
            closeGateway();
        }
    }, [isAuthenticated, isUserLoading, profileComplete, blockingMessage, isOpen, closeGateway]);

    if (isUserLoading || (profileComplete && !blockingMessage)) return null;

    const handleRegister = () => {
        clearVisitorMode();
        const targetPath = "/account";
        if (isAuthenticated) {
            navigate(targetPath);
            closeGateway();
        } else {
            login({
                appState: {
                    returnTo: targetPath,
                },
            });
        }
    };

    return (
        <Modal
            backdrop="blur"
            isOpen={isOpen}
            onClose={closeGateway}
            isDismissable={false}
            isKeyboardDismissDisabled={true}
            size="2xl"
            classNames={{
                base: "bg-background border border-default-100 shadow-2xl overflow-hidden",
                header: "border-none pt-8",
                body: "flex flex-col items-center text-center gap-6 px-8 pb-8",
                footer: "border-none pb-8 pt-0 px-8 flex flex-col gap-3",
                closeButton: "hidden",
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex justify-center">
                            <Image
                                src="/logo.png"
                                alt="Kdufoot Logo"
                                width={180}
                                className="drop-shadow-sm"
                            />
                        </ModalHeader>
                        <ModalBody>
                            <h1 className="text-2xl lg:text-3xl font-black bg-[linear-gradient(to_right,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899)] bg-clip-text text-transparent leading-tight mt-2 italic">
                                Bienvenue sur la plateforme n°1 de mise en relation entre clubs de football.
                            </h1>

                            {blockingMessage && (
                                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-2xl w-full flex items-center gap-3 animate-bounce shadow-lg shadow-danger/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                    </svg>
                                    <p className="font-bold text-sm leading-tight text-center flex-1">
                                        {blockingMessage}
                                    </p>
                                </div>
                            )}

                            <p className="text-default-500 text-base max-w-md font-medium">
                                Rejoignez la plus grande communauté d'éducateurs pour organiser vos matchs amicaux et tournois en quelques clics.
                            </p>
                        </ModalBody>
                        <ModalFooter>
                            <div className="flex flex-col gap-4 w-full">
                                <Button
                                    className={`${buttonGradient({ size: "lg" })} w-full font-black text-white bg-linear-to-r from-red-600 to-orange-500 border-none h-16 text-xl shadow-2xl shadow-orange-500/30 active:scale-95 transition-transform`}
                                    onPress={handleRegister}
                                >
                                    🚀 Remplir mon compte Kdufoot
                                </Button>

                                <div className="flex items-center gap-4 py-2">
                                    <div className="flex-1 h-px bg-default-100"></div>
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-default-400 font-bold whitespace-nowrap">Ou</span>
                                    <div className="flex-1 h-px bg-default-100"></div>
                                </div>

                                <Button
                                    variant="light"
                                    className="font-black h-14 text-default-500 hover:text-default-900 active:scale-95 transition-all uppercase tracking-widest text-xs"
                                    onPress={setVisitorMode}
                                >
                                    👀 Visiter sans compte
                                </Button>

                                <p className="text-[10px] text-default-400 text-center mt-2 italic font-medium leading-relaxed max-w-[280px] mx-auto">
                                    Note : La création et la participation nécessitent obligatoirement un profil 100% rempli et certifié.
                                </p>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
