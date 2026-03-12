import { useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { addToast } from "@heroui/toast";
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/button';
import { matchService } from '@/services/matches';
import { useNavigate } from 'react-router-dom';

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface BanStatus {
    isBanned: boolean;
    reason?: string;
}

export function useWebSocketSync(
    enabled: boolean = true,
    userId?: string,
    onBanStatusChange?: (status: BanStatus) => void,
    token?: string | null,
    isBlocked: boolean = false
) {
    const { t } = useTranslation('kdufoot');
    const navigate = useNavigate();
    const { mutate } = useSWRConfig();
    const [status, setStatus] = useState<WebSocketStatus>(enabled ? 'connecting' : 'disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);

    const onBanStatusChangeRef = useRef(onBanStatusChange);
    useEffect(() => {
        onBanStatusChangeRef.current = onBanStatusChange;
    }, [onBanStatusChange]);

    useEffect(() => {
        // Logique de nettoyage immédiat si désactivé
        if (!enabled) {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            setStatus('disconnected');
            return;
        }

        // Attendre le token si nous sommes authentifiés
        if (!token) {
            if (wsRef.current) {
                const ws = wsRef.current;
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                ws.onopen = null;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                wsRef.current = null;
            }
            setStatus('connecting');
            return;
        }

        function connect() {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            setStatus('connecting');
            const apiUrl = import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL || window.location.origin;
            let wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/+$/, '') + '/api/ws';

            if (token) {
                wsUrl += `?token=${encodeURIComponent(token)}`;
            }

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            let heartbeatInterval: NodeJS.Timeout;

            ws.onopen = () => {
                setStatus('connected');
                retryCountRef.current = 0; // Reset backoff on success

                heartbeatInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                if (event.data === 'pong') return;
                if (event.data === 'DATA_CHANGED') {
                    mutate((key) => typeof key === 'string' && key.startsWith('/api/'), (d: any) => d, { revalidate: true });
                    return;
                }

                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'NOTIFICATION') {
                        // ALWAYS mutate before any filtering to ensure badge/data refresh
                        mutate((key) => typeof key === 'string' && key.startsWith('/api/'), (d: any) => d, { revalidate: true });
                        mutate('/api/me/context', (d: any) => d, { revalidate: true });

                        // Early return if not intended for current user (targeted notification)
                        const isTargetedToMe = 
                            (payload.targetUserId && payload.targetUserId === userId) || 
                            (payload.targetUserIds && Array.isArray(payload.targetUserIds) && payload.targetUserIds.includes(userId));
                        
                        // If it's a targeted notification (has at least one target field) and I am not a target, ignore it.
                        if ((payload.targetUserId || payload.targetUserIds) && !isTargetedToMe) return;

                        let color: "default" | "primary" | "secondary" | "success" | "warning" | "danger" = 'primary';
                        let title = t('dashboard.status.pending');
                        let description = payload.message;

                        switch (payload.notificationType) {
                            case 'USER_BANNED':
                                color = 'danger'; title = 'Compte Bloqué'; mutate('/api/me/context', (d: any) => d, { revalidate: true });
                                if (onBanStatusChangeRef.current) onBanStatusChangeRef.current({ isBanned: true, reason: payload.data?.reason || payload.message });
                                break;
                            case 'USER_UNBANNED':
                                color = 'success'; title = 'Compte Débloqué'; mutate('/api/me/context', (d: any) => d, { revalidate: true });
                                if (onBanStatusChangeRef.current) onBanStatusChangeRef.current({ isBanned: false });
                                break;
                            case 'MATCH_UPDATE':
                            case 'MATCH_MODIFIED':
                                {
                                    const isOrganizer = payload.data?.owner_id === userId;
                                    if (isOrganizer) {
                                        // Silent for organizer, the form submit API already handles the success toast!
                                        return;
                                    } else {
                                        color = 'warning';
                                        title = t('dashboard.alerts.title');
                                        description = (
                                            <div className="cursor-pointer font-medium" onClick={() => navigate('/dashboard')}>
                                                {t('dashboard.alerts.message', {
                                                    team: payload.data?.host_club_name || 'un club',
                                                    date: payload.data?.match_date ? new Date(payload.data.match_date).toLocaleDateString('fr-FR') : 'date inconnue'
                                                })}
                                            </div>
                                        );
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/matches'), (d: any) => d, { revalidate: true });
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                        // Increment badge unread counter in localStorage
                                        const unreadKey = `kdufoot_unread_count_${userId || 'guest'}`;
                                        const current = parseInt(localStorage.getItem(unreadKey) || '0');
                                        localStorage.setItem(unreadKey, String(current + 1));
                                        window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                    }
                                }
                                // Show the toast for participant (organizer already returned)
                        addToast({ title, description, color, variant: 'flat', timeout: 5000 });
                                return;
                            case 'MATCH_CANCELLED':
                                // Message ciblés envoyés uniquement aux joueurs par le backend
                                color = 'danger';
                                title = "Annulation";
                                description = t('dashboard.notifications.cancellation', {
                                    team: payload.data?.host_club_name || 'un club',
                                    date: payload.data?.match_date ? new Date(payload.data.match_date).toLocaleDateString('fr-FR') : 'date inconnue'
                                });
                                mutate((key) => typeof key === 'string' && key.startsWith('/api/matches'), (d: any) => d, { revalidate: true });
                                mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                // Increment badge unread counter
                                {
                                    const uk = `kdufoot_unread_count_${userId || 'guest'}`;
                                    localStorage.setItem(uk, String(parseInt(localStorage.getItem(uk) || '0') + 1));
                                }
                                window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                        addToast({ title, description, color, variant: 'flat', timeout: 5000 });
                                return;
                            case 'TOURNAMENT_PUBLISHED':
                                color = 'success';
                                title = t('enums.type.tournament');
                                mutate((key) => typeof key === 'string' && key.includes('/api/tournaments'), (d: any) => d, { revalidate: true });
                                break;
                            case 'REQUEST_RECEIVED':
                            case 'NEW_APPLICANT':
                                {
                                    const isOrganizer = payload.data?.owner_id === userId;
                                    const isApplicant = payload.data?.user_id === userId;

                                    if (isOrganizer) {
                                        color = 'primary';
                                        title = t('dashboard.status.pending');
                                        description = `Vous avez reçu une demande de ${payload.data?.applicant_club_name || 'un club'} pour le match du ${payload.data?.match_date ? new Date(payload.data.match_date).toLocaleDateString('fr-FR') : 'date inconnue'}`;
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                        // Increment badge unread counter
                                        {
                                            const uk = `kdufoot_unread_count_${userId || 'guest'}`;
                                            localStorage.setItem(uk, String(parseInt(localStorage.getItem(uk) || '0') + 1));
                                        }
                                        window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));

                                        addToast({
                                            title,
                                            description: (
                                                <div className="flex flex-col gap-3">
                                                    <p>{description}</p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            color="success"
                                                            variant="solid"
                                                            className="font-black text-[10px]"
                                                            onPress={async () => {
                                                                if (token) {
                                                                    await matchService.updateRequestStatus(payload.data.match_id, payload.data.user_id, 'accepted', token);
                                                                    mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                                                    window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                                                }
                                                            }}
                                                        >
                                                            {t('dashboard.controls.accept').toUpperCase()}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="default"
                                                            variant="flat"
                                                            className="font-black text-[10px] bg-white/20 text-white"
                                                            onPress={() => {
                                                                navigate('/dashboard');
                                                            }}
                                                        >
                                                            {t('dashboard.controls.view').toUpperCase()}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="danger"
                                                            variant="solid"
                                                            className="font-black text-[10px]"
                                                            onPress={async () => {
                                                                if (token) {
                                                                    await matchService.updateRequestStatus(payload.data.match_id, payload.data.user_id, 'refused', token);
                                                                    mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                                                    window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                                                }
                                                            }}
                                                        >
                                                            {t('dashboard.controls.refuse').toUpperCase()}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ),
                                            color,
                                            variant: 'flat',
                                            timeout: 5000
                                        });
                                        return; // Organizer gets interactive toast
                                    } else if (isApplicant) {
                                        color = 'success';
                                        title = t('success');
                                        description = t('dashboard.alerts.success_discrete');
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                    } else {
                                        return; // Random users ignore this
                                    }
                                }
                                break;
                            case 'REQUEST_ACCEPTED':
                            case 'ENROLLMENT_ACCEPTED':
                                {
                                    const isOrganizer = payload.data?.owner_id === userId;
                                    const isApplicant = payload.data?.user_id === userId;

                                    if (isOrganizer) {
                                        return; // Organizer gets UI response instantly from button click
                                    } else if (isApplicant) {
                                        color = 'success';
                                        title = t('dashboard.status.accepted');
                                        description = t('dashboard.notifications.acceptance_player', {
                                            date: payload.data?.match_date ? new Date(payload.data.match_date).toLocaleDateString('fr-FR') : 'date inconnue',
                                            team: payload.data?.host_club_name || 'un club'
                                        });
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                    } else {
                                        return; // Random users ignore this
                                    }
                                }
                                // Increment badge unread counter
                                {
                                    const uk = `kdufoot_unread_count_${userId || 'guest'}`;
                                    localStorage.setItem(uk, String(parseInt(localStorage.getItem(uk) || '0') + 1));
                                }
                                window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                        addToast({ title, description, color, variant: 'flat', timeout: 5000 });
                                return;
                            case 'ENROLLMENT_REFUSED':
                                {
                                    const isOrganizer = payload.data?.owner_id === userId;
                                    const isApplicant = payload.data?.user_id === userId;

                                    if (isOrganizer) {
                                        return; // Organizer gets UI response instantly from button click
                                    } else if (isApplicant) {
                                        color = 'warning'; // Info pour refusé
                                        title = t('dashboard.status.refused');
                                        description = t('dashboard.notifications.rejection_player', {
                                            date: payload.data?.match_date ? new Date(payload.data.match_date).toLocaleDateString('fr-FR') : 'date inconnue',
                                            team: payload.data?.host_club_name || 'un club'
                                        });
                                        mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard'), (d: any) => d, { revalidate: true });
                                    } else {
                                        return; // Random users ignore this
                                    }
                                }
                                // Increment badge unread counter
                                {
                                    const uk = `kdufoot_unread_count_${userId || 'guest'}`;
                                    localStorage.setItem(uk, String(parseInt(localStorage.getItem(uk) || '0') + 1));
                                }
                                window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                        addToast({ title, description, color, variant: 'flat', timeout: 6000 });
                                return;
                            case 'TEAM_WITHDRAWAL':
                                color = 'danger';
                                title = t('dashboard.status.refused');
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                // Increment badge unread counter
                                {
                                    const uk = `kdufoot_unread_count_${userId || 'guest'}`;
                                    localStorage.setItem(uk, String(parseInt(localStorage.getItem(uk) || '0') + 1));
                                }
                                window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                break;
                        }
                        addToast({ title, description, color, variant: 'solid', timeout: 6000 });
                    }
                } catch (e) { }
            };

            ws.onclose = (event) => {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                setStatus('connecting');
                // Reconnect on abnormal closure or if we still have token
                if (!event.wasClean || event.code === 1006 || (enabled && token)) {
                    scheduleReconnect();
                }
            };

            ws.onerror = (errorEvent) => {
                console.error('[WebSocket] Generic Error occurred:', errorEvent);
                console.error('Check DevTools Network tab for more details on the WebSocket connection.');
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            };
        }

        function scheduleReconnect() {
            if (!enabled || !token) return;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

            const strategy = [1000, 2000, 5000];
            const backoffTime = retryCountRef.current < strategy.length
                ? strategy[retryCountRef.current]
                : 30000;

            retryCountRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, backoffTime);
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                const ws = wsRef.current;
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                ws.onopen = null;

                // IMPORTANT: Ne pas appeler close() si CONNECTING pour éviter le log console 
                // "WebSocket is closed before the connection is established"
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                wsRef.current = null;
            }
        };
    }, [mutate, enabled, userId, token, isBlocked, t, navigate]);

    return { status };
}
