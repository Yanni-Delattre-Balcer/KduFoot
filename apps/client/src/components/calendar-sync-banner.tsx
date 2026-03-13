import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Calendar, Bell, ChevronRight, X, CheckCircle2 } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "../services/api";

import { useUser } from "../authentication";

export const CalendarSyncBanner: React.FC = () => {
    const { getAccessTokenSilently } = useAuth0();
    const { user } = useUser();
    const [isVisible, setIsVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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

    const handleConnect = async () => {
        setIsSyncing(true);
        try {
            const data = await api.get("/api/users/me/calendar-link", getAccessTokenSilently);
            if (data && (data as any).url) {
                // Trigger the webcal link
                window.location.href = (data as any).url;
                // Once clicked/connected, we can consider it "done" for this session or permanently?
                // The prompt says "Si le flux est déjà actif, l'application ne doit plus jamais afficher cette demande."
                // The backend will set the token, so user.calendar_token will be populated on next refetch.
            }
        } catch (error) {
            console.error("Failed to fetch calendar link", error);
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

    if (!isVisible) return null;

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
                            <Calendar size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white tracking-tight">Synchronisation Calendrier</h3>
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
                    Restez informé de vos matchs et tournois ! Connectez votre calendrier pour synchroniser automatiquement vos rencontres et recevoir des rappels.
                </p>

                <div className="flex flex-col gap-2.5 mt-2">
                    <Button 
                        color="primary" 
                        onPress={handleConnect}
                        isLoading={isSyncing}
                        className="w-full font-black tracking-tight h-12 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 group"
                        endContent={!isSyncing && <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />}
                    >
                        Connecter maintenant
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
                            Je ne veux pas
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
