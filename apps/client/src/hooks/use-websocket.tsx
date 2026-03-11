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
                console.log(`[WebSocket] Stopping connection (Disabled)`);
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
                console.log('[WebSocket] Connected to hub');
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
                        mutate((key) => typeof key === 'string' && key.startsWith('/api/'), (d: any) => d, { revalidate: true });
                        if (payload.targetUserId && payload.targetUserId !== userId) return;

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
                                                    team: payload.data?.host_club_name || '',
                                                    date: payload.data?.match_date || ''
                                                })}
                                            </div>
                                        );
                                        mutate((key) => typeof key === 'string' && key.includes('/api/matches'), (d: any) => d, { revalidate: true });
                                        mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                        window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                    }
                                }
                                break;
                            case 'MATCH_CANCELLED':
                                // Message ciblés envoyés uniquement aux joueurs par le backend
                                color = 'danger';
                                title = "Annulation";
                                description = `Le match contre ${payload.data?.host_club_name || ''} le ${new Date(payload.data?.match_date || '').toLocaleDateString('fr-FR')} a été annulé par l'organisateur.`;
                                mutate((key) => typeof key === 'string' && key.includes('/api/matches'), (d: any) => d, { revalidate: true });
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                window.dispatchEvent(new CustomEvent('kdufoot_matches_updated'));
                                break;
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
                                        description = `Vous avez reçu une demande de ${payload.data?.applicant_club_name || ''} pour le match du ${new Date(payload.data?.match_date || '').toLocaleDateString('fr-FR')}`;
                                        mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
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
                                                                    mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
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
                                                                    mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
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
                                            variant: 'solid',
                                            timeout: 10000
                                        });
                                        return; // Organizer gets interactive toast
                                    } else if (isApplicant) {
                                        color = 'success';
                                        title = t('success');
                                        description = t('dashboard.alerts.success_discrete');
                                        mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
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
                                            date: payload.data?.match_date || '',
                                            team: payload.data?.host_club_name || ''
                                        });
                                        mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                    } else {
                                        return; // Random users ignore this
                                    }
                                }
                                break;
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
                                            date: payload.data?.match_date || '',
                                            team: payload.data?.host_club_name || ''
                                        });
                                        mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                    } else {
                                        return; // Random users ignore this
                                    }
                                }
                                break;
                            case 'TEAM_WITHDRAWAL':
                                color = 'danger';
                                title = t('dashboard.status.refused');
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'), (d: any) => d, { revalidate: true });
                                break;
                        }
                        addToast({ title, description, color, variant: 'solid', timeout: 6000 });
                    }
                } catch (e) { }
            };

            ws.onclose = (event) => {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                console.log(`[WebSocket] Disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
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
