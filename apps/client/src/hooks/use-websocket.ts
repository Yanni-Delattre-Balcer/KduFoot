import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';

export function useWebSocketSync() {
    const { mutate } = useSWRConfig();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);

    useEffect(() => {
        function connect() {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
            const wsUrl = apiUrl.replace(/^http/, 'ws') + '/api/ws';

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected to hub');
                retryCountRef.current = 0; // Reset backoff on successful connection
            };

            ws.onmessage = (event) => {
                if (event.data === 'DATA_CHANGED') {
                    console.log('[WebSocket] Received DATA_CHANGED, revalidating cache...');
                    // Use a filter to match all keys and revalidate them
                    mutate(() => true, undefined, { revalidate: true });
                }
            };

            ws.onclose = () => {
                console.log('[WebSocket] Disconnected');
                scheduleReconnect();
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
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
    }, [mutate]);
}
