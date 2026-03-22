import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";

export class WebSocketHub extends DurableObject<Env> {
    private sessions: Set<WebSocket>;

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

        server.addEventListener("message", (event) => {
            // Keep-alive pings can be sent by the client
            if (event.data === "ping") {
                server.send("pong");
            }
        });

        server.addEventListener("close", () => {
            this.sessions.delete(server);
        });

        server.addEventListener("error", () => {
            this.sessions.delete(server);
        });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    private broadcast(message: string) {
        // Send message to all connected clients
        for (const session of this.sessions) {
            try {
                session.send(message);
            } catch (error) {
                // If a connection is broken, quietly remove it
                this.sessions.delete(session);
            }
        }
    }
}
