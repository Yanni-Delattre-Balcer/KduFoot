import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { useAuth } from "@/authentication";
import { useNavigate } from "react-router-dom";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { buttonGradient } from "./primitives";

export const WelcomeGateway: React.FC = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { isOpen, closeGateway, setVisitorMode, blockingMessage } = useWelcomeGateway();

    const handleRegister = () => {
        if (isAuthenticated) {
            navigate("/dashboard");
            closeGateway();
        } else {
            login({
                appState: {
                    returnTo: "/dashboard",
                },
            });
        }
    };

    const handleLogin = () => {
        login({
            appState: {
                returnTo: window.location.pathname,
            },
        });
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
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    className={`${buttonGradient({ size: "lg" })} w-full font-black text-white bg-linear-to-r from-red-600 to-orange-500 border-none h-14 text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-transform`}
                                    onPress={handleRegister}
                                >
                                    📝 Remplir mon compte Kdufoot
                                </Button>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                    <Button
                                        variant="flat"
                                        color="primary"
                                        className="font-black h-14 border border-primary/20 bg-primary/10 shadow-lg shadow-primary/5 active:scale-95 transition-transform"
                                        onPress={handleLogin}
                                    >
                                        👋 J'ai déjà un compte
                                    </Button>
                                    <Button
                                        variant="flat"
                                        className="font-black h-14 border border-default-200 bg-default-100 text-default-600 active:scale-95 transition-transform"
                                        onPress={setVisitorMode}
                                    >
                                        👀 Visiter sans compte
                                    </Button>
                                </div>

                                <p className="text-[10px] text-default-400 text-center mt-2 italic font-medium">
                                    La création et la participation nécessitent un profil rempli.
                                </p>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
