import { Env } from "../types/env";

export async function broadcastDataChanged(env: Env) {
    if (!env.WEBSOCKET_HUB) return;
    try {
        const id = env.WEBSOCKET_HUB.idFromName("global-hub");
        const hub = env.WEBSOCKET_HUB.get(id);
        const request = new Request("http://dummy/broadcast", {
            method: "POST",
            body: "DATA_CHANGED"
        });
        // We use waitUntil or just await it if we are still inside the request context
        // In most Cloudflare routing, we don't have direct access to ctx.waitUntil here easily unless passed down,
        // so we fire and forget, catching errors silently to not break the main response flow.
        hub.fetch(request as any).catch(() => { });
    } catch (e) {
        console.error("Failed to trigger broadcast", e);
    }
}
