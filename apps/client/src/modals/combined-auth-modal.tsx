import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "@/services/api";
import { addToast } from "@heroui/toast";
import { useUser } from "@/authentication";

interface CombinedAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CombinedAuthModal: React.FC<CombinedAuthModalProps> = ({ isOpen, onClose }) => {
    const { getAccessTokenSilently } = useAuth0();
    const { updateUser } = useUser();
    const [isSyncing, setIsSyncing] = useState(false);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = async () => {
        console.log("[Push Debug] Starting subscription process...");
        try {
            if (!('serviceWorker' in navigator)) {
                console.error("[Push Debug] Service Workers NOT supported in this browser");
                return false;
            }

            console.log("[Push Debug] Checking Service Worker readiness...");
            const registration = await navigator.serviceWorker.ready;
            console.log("[Push Debug] SW Registration ready:", registration.active?.state || "No active SW");

            if (!registration.pushManager) {
                console.error("[Push Debug] PushManager NOT available on this registration");
                return false;
            }

            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.VAPID_PUBLIC_KEY;
            
            if (!vapidPublicKey) {
                console.error("[Push Debug] VAPID Public Key missing from environment variables");
                return false;
            }

            console.log("[Push Debug] Subscribing with VAPID key...");
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            console.log("[Push Debug] Push subscription success endpoint:", subscription.endpoint);

            // Save to backend
            await updateUser({
                push_subscription: JSON.stringify(subscription)
            });
            
            console.log("[Push Debug] Push subscription successfully saved to backend");
            return true;
        } catch (error: any) {
            console.error("[Push Debug] Critical failure in push subscription:", error);
            if (error.name === 'NotAllowedError') {
                console.warn("[Push Debug] Permission denied by user or system rules");
            } else if (error.name === 'AbortError') {
                console.warn("[Push Debug] Subscription aborted");
            }
            return false;
        }
    };

    const handleAllEnable = async () => {
        setIsSyncing(true);
        console.log("[Onboarding] User clicked 'Tout activer'");
        
        // 1. Notifications
        try {
            if (typeof Notification === 'undefined') {
                console.warn("[Push Debug] Notification API NOT supported in this browser environment");
            } else {
                console.log("[Push Debug] Current permission level:", Notification.permission);
                if (Notification.permission !== 'granted') {
                    console.log("[Push Debug] Requesting permission...");
                    const permission = await Notification.requestPermission();
                    console.log("[Push Debug] Permission result:", permission);
                    
                    if (permission === 'granted') {
                        const success = await subscribeToPush();
                        if (success) {
                            addToast({ title: "Notifications activées !", color: "success" });
                        } else {
                            addToast({ title: "Erreur technique (Push)", color: "danger" });
                        }
                    } else {
                        console.warn("[Push Debug] Permission was NOT granted");
                    }
                } else {
                    console.log("[Push Debug] Permission already granted, refreshing subscription...");
                    await subscribeToPush();
                }
            }
        } catch (e) {
            console.error("[Push Debug] Error during notification request flow:", e);
        }

        // 2. Calendar
        try {
            console.log("[Calendar] Fetching sync link...");
            const data = await api.get("/api/users/me/calendar-link", getAccessTokenSilently);
            if (data && (data as any).url) {
                let finalUrl = (data as any).url;
                
                // Android Compatibility: Force Google Calendar Web UI
                const ua = navigator.userAgent.toLowerCase();
                const isAndroid = /android/.test(ua);

                if (isAndroid) {
                    console.log("[Calendar] Android detected, using Google Calendar redirect");
                    // Convert webcal:// to https:// for Google
                    const httpUrl = finalUrl.replace('webcal://', 'https://');
                    finalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(httpUrl)}`;
                }

                console.log("[Calendar] Redirecting to:", finalUrl);
                window.location.href = finalUrl;
                addToast({ title: "Synchronisation calendrier lancée !", color: "success" });
            }
        } catch (error) {
            console.error("[Calendar] Failed to fetch calendar link:", error);
            addToast({ title: "Échec de la synchronisation calendrier", color: "danger" });
        } finally {
            setIsSyncing(false);
            onClose(); // Close modal after action
        }
    };

    const handleDismissPermanent = () => {
        console.log("[Onboarding] User clicked 'Je ne veux pas'");
        localStorage.setItem("kdufoot-auth-onboarding-dismissed", "true");
        onClose();
    };

    const handleDismissSession = () => {
        console.log("[Onboarding] User clicked 'Plus tard'");
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
                    <div className="p-4 rounded-[2rem] bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Bell size={32} strokeWidth={2.5} />
                    </div>
                </ModalHeader>
                <ModalBody className="text-center">
                    <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight italic leading-tight">
                        Restez à jour !
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                        Ne ratez aucune info ! Activez les notifications pour les alertes de match et synchronisez votre calendrier pour ne plus rien oublier.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full mt-2">
                        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 group">
                            <Bell size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Alertes Match</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 group">
                            <Calendar size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Calendrier</span>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            onPress={handleAllEnable}
                            isLoading={isSyncing}
                            className="bg-blue-600 text-white font-black tracking-tight w-full rounded-2xl h-14 text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-500"
                            size="lg"
                            endContent={!isSyncing && <ChevronRight size={20} />}
                        >
                            Tout activer
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
                                className="text-zinc-600 font-bold rounded-2xl h-10 text-xs hover:text-zinc-400"
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
