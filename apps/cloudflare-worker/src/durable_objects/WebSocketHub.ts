/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";

export class WebSocketHub extends DurableObject<Env> {
    private sessions: Set<WebSocket>;
    private broadcastTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Set();
    }

    async fetch(request: Request): Promise<Response> {
        // Upgrade request to WebSocket
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            // It might be a broadcast triggered internally
            if (request.method === "POST" && new URL(request.url).pathname.endsWith('/broadcast')) {
                const body = await request.text();
                this.broadcast(body);
                return new Response("Broadcasted", { status: 200 });
            }
            return new Response("Expected Upgrade: websocket", { status: 426 });
        }

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        server.accept();
        this.sessions.add(server);
        this.broadcastCount();

        server.addEventListener("message", (event) => {
            // Keep-alive pings can be sent by the client
            if (event.data === "ping") {
                server.send("pong");
            }
        });

        server.addEventListener("close", () => {
            this.sessions.delete(server);
            this.broadcastCount();
        });

        server.addEventListener("error", () => {
            this.sessions.delete(server);
            this.broadcastCount();
        });

        const requestedProtocol = request.headers.get("Sec-WebSocket-Protocol");
        const acceptProtocol = requestedProtocol?.split(",").map(p => p.trim()).find(p => p.startsWith("bearer-"));
        return new Response(null, {
            status: 101,
            webSocket: client,
            ...(acceptProtocol ? { headers: { "Sec-WebSocket-Protocol": acceptProtocol } } : {})
        });
    }

    private broadcastCount() {
        // Simple throttle: If a broadcast is already scheduled, don't schedule another.
        // This batches all connections/disconnections within a 3 second window.
        if (this.broadcastTimeout) {
            return;
        }

        this.broadcastTimeout = setTimeout(() => {
            this.broadcast(JSON.stringify({
                type: "ONLINE_COUNT",
                count: this.sessions.size
            }));
            this.broadcastTimeout = null;
        }, 3000);
    }

    private broadcast(message: string) {
        // Send message to all connected clients
        for (const session of this.sessions) {
            try {
                if (session.readyState === 1) { // 1 = OPEN
                    session.send(message);
                } else {
                    this.sessions.delete(session);
                }
            } catch (_error) {
                // If a connection is broken, quietly remove it
                this.sessions.delete(session);
            }
        }
    }
}
