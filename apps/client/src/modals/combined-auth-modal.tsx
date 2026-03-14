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
                <ModalHeader className="flex justify-center flex-col items-center gap-4 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-500/10 blur-[80px] -z-10 rounded-full" />
                    <div className="p-4 rounded-[2.5rem] bg-gradient-to-br from-purple-500/30 to-indigo-500/20 text-purple-300 border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                        <Calendar size={36} strokeWidth={2} />
                    </div>
                </ModalHeader>
                <ModalBody className="text-center px-6 sm:px-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight leading-tight">
                        Ne manquez aucun match&nbsp;!
                    </h1>
                    <p className="mt-2 text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed max-w-[280px] sm:max-w-none mx-auto opacity-80">
                        Synchronisez vos rencontres directement avec votre calendrier pour des rappels intelligents et un suivi en temps réel.
                    </p>

                    <div className="flex justify-center w-full mt-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/20 blur-2xl group-hover:bg-purple-500/30 transition-colors rounded-full" />
                            <div className="relative flex flex-col items-center gap-3 p-5 sm:p-7 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-md border border-white/10 w-full min-w-[140px] sm:min-w-[180px] hover:border-white/20 transition-all duration-300">
                                <Calendar size={32} className="text-purple-400 group-hover:scale-110 transition-transform duration-500" />
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Calendrier Natif</span>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="px-6 sm:px-10 pb-10">
                    <div className="flex flex-col gap-4 w-full">
                        <Button
                            onPress={handleCalendarSync}
                            isLoading={isSyncing}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold tracking-tight w-full rounded-2xl h-14 text-base sm:text-lg shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                            size="lg"
                            endContent={!isSyncing && <ChevronRight size={20} />}
                        >
                            Connecter mon calendrier
                        </Button>

                        <div className="flex items-center gap-4 px-2">
                            <button
                                onClick={handleDismissSession}
                                className="flex-1 text-zinc-500 hover:text-zinc-300 font-semibold text-xs transition-colors py-2"
                            >
                                Peut-être plus tard
                            </button>
                            <div className="w-[1px] h-3 bg-white/10" />
                            <button
                                onClick={handleDismissPermanent}
                                className="flex-1 text-zinc-600 hover:text-zinc-400 font-semibold text-xs transition-colors py-2"
                            >
                                Ne plus afficher
                            </button>
                        </div>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
