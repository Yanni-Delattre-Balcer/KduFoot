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
        // Wait for the DO to process the broadcast so CF doesn't kill the worker
        await hub.fetch(request as any).catch(() => { });
    } catch (e) {
        console.error("Failed to trigger broadcast", e);
    }
}
