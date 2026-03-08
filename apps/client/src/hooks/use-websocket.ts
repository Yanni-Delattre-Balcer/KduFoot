import { useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export function useWebSocketSync(enabled: boolean = true) {
    const { mutate } = useSWRConfig();
    const [status, setStatus] = useState<WebSocketStatus>(enabled ? 'connecting' : 'disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);

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
                    console.log('[WebSocket] Sending heartbeat ping');
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
                    console.log('[WebSocket] Received heartbeat pong');
                    return;
                }

                if (event.data === 'DATA_CHANGED') {
                    console.log('[WebSocket] Received DATA_CHANGED, revalidating cache...');
                    // Match keys that are strings and belong to the API namespace
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('/api/'),
                        (currentData: any) => currentData,
                        { revalidate: true }
                    );
                }
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
                ws.close(); // Triggers onclose -> scheduleReconnect
            };
        }

        function scheduleReconnect() {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current += 1;
            console.log(`[WebSocket] Reconnecting in ${backoffTime / 1000}s...`);
            reconnectTimeoutRef.current = setTimeout(connect, backoffTime);
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect loop on intentional unmount
                wsRef.current.close();
            }
        };
    }, [mutate, enabled]);

    return { status };
}
