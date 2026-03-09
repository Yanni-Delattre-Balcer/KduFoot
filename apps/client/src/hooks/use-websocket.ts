import { useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { addToast } from "@heroui/toast";

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface BanStatus {
    isBanned: boolean;
    reason?: string;
}

export function useWebSocketSync(enabled: boolean = true, userId?: string, onBanStatusChange?: (status: BanStatus) => void) {
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
        if (!enabled) {
            if (wsRef.current) {
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

        function connect() {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            setStatus('connecting');
            const apiUrl = import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL || window.location.origin;
            const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/+$/, '') + '/api/ws';

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 30000); // 30 seconds

            ws.onopen = () => {
                console.log('[WebSocket] Connected to hub');
                setStatus('connected');
                retryCountRef.current = 0; // Reset backoff on successful connection
            };

            ws.onmessage = (event) => {
                if (event.data === 'pong') {
                    return;
                }

                if (event.data === 'DATA_CHANGED') {
                    console.log('[WebSocket] Received DATA_CHANGED, revalidating cache...');
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('/api/'),
                        undefined,
                        { revalidate: true }
                    );
                    return;
                }

                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'NOTIFICATION') {
                        // Global cache invalidation
                        mutate((key) => typeof key === 'string' && key.startsWith('/api/'), (currentData: any) => currentData, { revalidate: true });

                        if (payload.targetUserId && payload.targetUserId !== userId) {
                            return; // Not for us
                        }

                        let color: "default" | "primary" | "secondary" | "success" | "warning" | "danger" = 'primary';
                        let title = "KduFoot Notification";
                        let description = payload.message;
                        switch (payload.notificationType) {
                            case 'USER_BANNED':
                                color = 'danger';
                                title = 'Compte Bloqué';
                                mutate('/api/me/context');
                                if (onBanStatusChangeRef.current) {
                                    onBanStatusChangeRef.current({ isBanned: true, reason: payload.data?.reason || payload.message });
                                }
                                break;
                            case 'USER_UNBANNED':
                                color = 'success';
                                title = 'Compte Débloqué';
                                mutate('/api/me/context');
                                if (onBanStatusChangeRef.current) {
                                    onBanStatusChangeRef.current({ isBanned: false });
                                }
                                break;
                            case 'MATCH_UPDATE':
                            case 'MATCH_MODIFIED':
                                color = 'warning';
                                title = 'Match Mis à jour';
                                mutate((key) => typeof key === 'string' && key.includes('/api/matches'));
                                break;
                            case 'MATCH_CANCELLED':
                                color = 'danger';
                                title = 'Match Annulé';
                                mutate((key) => typeof key === 'string' && key.includes('/api/matches'));
                                break;
                            case 'TOURNAMENT_PUBLISHED':
                                color = 'success';
                                title = 'Nouveau Tournoi';
                                mutate((key) => typeof key === 'string' && key.includes('/api/tournaments'));
                                break;
                            case 'REQUEST_RECEIVED':
                            case 'NEW_APPLICANT':
                                color = 'primary';
                                title = 'Nouvelle Demande';
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'));
                                break;
                            case 'REQUEST_ACCEPTED':
                            case 'ENROLLMENT_ACCEPTED':
                                color = 'success';
                                title = 'Demande Acceptée';
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'));
                                break;
                            case 'ENROLLMENT_REFUSED':
                                color = 'warning';
                                title = 'Demande Refusée';
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'));
                                break;
                            case 'TEAM_WITHDRAWAL':
                                color = 'danger';
                                title = 'Désistement';
                                mutate((key) => typeof key === 'string' && key.includes('/api/dashboard'));
                                break;
                            case 'NEW_MATCH_NEARBY':
                                color = 'primary';
                                title = 'Match à proximité';
                                break;
                        }

                        addToast({ title, description, color, variant: 'solid', timeout: 6000 });
                    }
                } catch (e) { }
            };

            ws.onclose = () => {
                console.log('[WebSocket] Disconnected');
                clearInterval(heartbeatInterval);
                setStatus('connecting');
                scheduleReconnect();
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                clearInterval(heartbeatInterval);
                ws.close();
            };
        }

        function scheduleReconnect() {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, backoffTime);
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [mutate, enabled, userId]);

    return { status };
}
