import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Bell, ChevronRight, X, CheckCircle2 } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import { addToast } from "@heroui/toast";

import { useUser } from "../authentication";

export const CalendarSyncBanner: React.FC = () => {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const { user, updateUser } = useUser();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // If user is already synced and has push, don't show the banner
        const checkStatus = async () => {
            if (user?.calendar_token && Notification.permission === 'granted') {
                setIsVisible(false);
                return;
            }
        };
        checkStatus();
    }, [user?.calendar_token]);

    useEffect(() => {
        const handleShow = () => {
            setIsVisible(true);
            sessionStorage.removeItem("calendar-banner-dismissed");
        };
        window.addEventListener('kdufoot_show_auth_tunnel', handleShow);
        return () => window.removeEventListener('kdufoot_show_auth_tunnel', handleShow);
    }, []);

    useEffect(() => {
        // If user is already synced, don't show the banner
        if (user?.calendar_token) {
            setIsVisible(false);
            return;
        }

        // Check permanent dismissal
        const isNeverShow = localStorage.getItem("calendar-banner-never-show") === "true";
        if (isNeverShow) {
            setIsVisible(false);
            return;
        }

        // Check session dismissal
        const isDismissed = sessionStorage.getItem("calendar-banner-dismissed") === "true";
        if (!isDismissed) {
            setIsVisible(true);
        }
    }, [user?.calendar_token]);

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
        try {
            const registration = await navigator.serviceWorker.ready;
            const vapidPublicKey = import.meta.env.VAPID_PUBLIC_KEY;
            
            if (!vapidPublicKey) {
                console.warn("VAPID Public Key missing");
                return false;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Save to backend
            await updateUser({
                push_subscription: JSON.stringify(subscription)
            });
            
            return true;
        } catch (error) {
            console.error("Push subscription failed:", error);
            return false;
        }
    };

    const handleAllEnable = async () => {
        setIsSyncing(true);
        
        // 1. Notifications
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeToPush();
                addToast({ title: "Notifications activées !", color: "success" });
            }
        } else {
            await subscribeToPush();
        }

        // 2. Calendar
        try {
            const data = await api.get("/api/users/me/calendar-link", getAccessTokenSilently);
            if (data && (data as any).url) {
                window.location.href = (data as any).url;
                addToast({ title: "Synchronisation calendrier lancée !", color: "success" });
            }
        } catch (error) {
            console.error("Failed to fetch calendar link", error);
            addToast({ title: "Échec de la synchronisation calendrier", color: "danger" });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem("calendar-banner-dismissed", "true");
    };

    const handleNever = () => {
        setIsVisible(false);
        localStorage.setItem("calendar-banner-never-show", "true");
    };

    if (!isAuthenticated || !isVisible || location.pathname === '/') return null;

    return (
        <Card 
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[100] border-none bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500"
            radius="lg"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <CardBody className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <Bell size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white tracking-tight">Alertes & Calendrier</h3>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Nouveauté</p>
                        </div>
                    </div>
                    <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm" 
                        onPress={handleDismiss} 
                        className="text-white/40 hover:text-white/80 -mr-2 -mt-2"
                    >
                        <X size={18} />
                    </Button>
                </div>

                <p className="text-sm text-white/70 leading-relaxed">
                    Ne ratez aucune info ! Activez les notifications pour les alertes de match et synchronisez votre calendrier pour ne plus rien oublier.
                </p>

                <div className="flex flex-col gap-2.5 mt-2">
                    <Button 
                        color="primary" 
                        onPress={handleAllEnable}
                        isLoading={isSyncing}
                        className="w-full font-black tracking-tight h-12 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 group"
                        endContent={!isSyncing && <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />}
                    >
                        Tout activer
                    </Button>
                    
                    <div className="flex gap-2">
                        <Button 
                            variant="flat" 
                            onPress={handleDismiss}
                            className="flex-1 font-bold text-xs h-9 bg-white/5 hover:bg-white/10 text-white/70"
                        >
                            Pas maintenant
                        </Button>
                        <Button 
                            variant="light" 
                            onPress={handleNever}
                            className="flex-1 font-bold text-xs h-9 text-white/40 hover:text-white/60"
                        >
                            Déjà fait
                        </Button>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5 mt-1">
                        <div className="flex items-center gap-1.5 opacity-50">
                            <CheckCircle2 size={12} className="text-blue-400" />
                            <span className="text-[10px] text-white/60 font-medium tracking-tight">Auto-sync</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-50">
                            <Bell size={12} className="text-blue-400" />
                            <span className="text-[10px] text-white/60 font-medium tracking-tight">Rappels 24h & 4h</span>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};
