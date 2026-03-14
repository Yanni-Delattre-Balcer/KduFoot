import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Calendar, ChevronRight } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "@/services/api";
import { addToast } from "@heroui/toast";

interface CombinedAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CombinedAuthModal: React.FC<CombinedAuthModalProps> = ({ isOpen, onClose }) => {
    const { getAccessTokenSilently } = useAuth0();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleCalendarSync = async () => {
        setIsSyncing(true);
        console.log("[Calendar] Starting manual synchronization...");
        
        try {
            console.log("[Calendar] Fetching sync link...");
            const data = await api.get("/api/users/me/calendar-link", getAccessTokenSilently);
            if (data && (data as any).url) {
                const finalUrl = (data as any).url.replace(/^https?:\/\//, 'webcal://');
                
                console.log("[Calendar] Redirecting to universal webcal link:", finalUrl);
                window.location.href = finalUrl;
                addToast({ title: "Synchronisation calendrier lancée !", color: "success" });
            }
        } catch (error) {
            console.error("[Calendar] Failed to fetch calendar link:", error);
            addToast({ title: "Échec de la synchronisation calendrier", color: "danger" });
        } finally {
            setIsSyncing(false);
            onClose();
        }
    };

    const handleDismissPermanent = () => {
        localStorage.setItem("kdufoot-auth-onboarding-dismissed", "true");
        onClose();
    };

    const handleDismissSession = () => {
        sessionStorage.setItem("kdufoot-auth-onboarding-dismissed", "true");
        onClose();
    };

    return (
        <Modal
            backdrop="blur"
            isOpen={isOpen}
            onClose={onClose}
            isDismissable={false}
            isKeyboardDismissDisabled={true}
            size="md"
            classNames={{
                base: "bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden",
                header: "border-none pt-8",
                body: "flex flex-col gap-6 px-8 pb-8",
                footer: "border-none pb-8 pt-0 px-8 flex flex-col gap-3",
                closeButton: "hidden",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex justify-center flex-col items-center gap-4">
                    <div className="p-4 rounded-[2rem] bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Calendar size={32} strokeWidth={2.5} />
                    </div>
                </ModalHeader>
                <ModalBody className="text-center">
                    <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight italic leading-tight">
                        Ne manquez aucun match !
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                        Synchronisez vos rencontres directement avec l'application calendrier de votre téléphone.
                    </p>

                    <div className="flex justify-center w-full mt-2">
                        <div className="flex flex-col items-center gap-2 p-6 rounded-3xl bg-white/5 border border-white/10 group w-full max-w-[200px]">
                            <Calendar size={32} className="text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-white/60 font-black uppercase tracking-widest mt-2">Calendrier Natif</span>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            onPress={handleCalendarSync}
                            isLoading={isSyncing}
                            className="bg-purple-600 text-white font-black tracking-tight w-full rounded-2xl h-14 text-lg shadow-xl shadow-purple-500/20 hover:bg-purple-500"
                            size="lg"
                            endContent={!isSyncing && <ChevronRight size={20} />}
                        >
                            Connecter mon calendrier
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onPress={handleDismissSession}
                                variant="flat"
                                className="bg-white/5 text-zinc-400 font-bold rounded-2xl h-10 text-xs"
                            >
                                Plus tard
                            </Button>
                            <Button
                                onPress={handleDismissPermanent}
                                variant="light"
                                className="text-zinc-600 font-bold rounded-2xl h-10 text-xs hover: Zinc-400"
                            >
                                Je ne veux pas
                            </Button>
                        </div>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
