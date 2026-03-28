import { useEffect, useState, useRef } from "react";

/**
 * Hook to get the real-time online player count via WebSocket.
 * Connects to the public /api/ws endpoint without requiring authentication.
 */
export function useOnlineCount() {
  const [count, setCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const apiUrl =
      import.meta.env.API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin;

    // Normalize WS URL
    const wsUrl = apiUrl.replace(/^http/, "ws").replace(/\/+$/, "") + "/api/ws";

    function connect() {
      // Connect as guest (no protocols/token)
      const ws = new WebSocket(wsUrl);

      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          if (event.data === "pong") return;
          const data = JSON.parse(event.data);

          if (data.type === "ONLINE_COUNT") {
            setCount(data.count);
          }
        } catch (e) {
          // Ignore non-json or malformed messages
        }
      };

      ws.onopen = () => {
        // Keep-alive heartbeat
        const interval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);

        (ws as any)._heartbeat = interval;
      };

      ws.onclose = () => {
        const interval = (ws as any)._heartbeat;

        if (interval) clearInterval(interval);
        // Basic reconnection logic
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (wsRef.current) {
        const ws = wsRef.current;

        ws.onclose = null;
        const interval = (ws as any)._heartbeat;

        if (interval) clearInterval(interval);
        ws.close();
      }
    };
  }, []);

  return count;
}
