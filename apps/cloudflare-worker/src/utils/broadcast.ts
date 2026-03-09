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

export type NotificationType =
    | 'ENROLLMENT_ACCEPTED'
    | 'ENROLLMENT_REFUSED'
    | 'MATCH_MODIFIED'
    | 'MATCH_CANCELLED'
    | 'NEW_APPLICANT'
    | 'TEAM_WITHDRAWAL'
    | 'NEW_MATCH_NEARBY'
    | 'USER_BANNED'
    | 'USER_UNBANNED';

export interface NotificationPayload {
    type: 'NOTIFICATION';
    notificationType: NotificationType;
    targetUserId?: string; // If undefined, considered global or filterable by client
    targetClubId?: string; // E.g., for "NEW_MATCH_NEARBY"
    message: string;
    actionUrl?: string;
    data?: any;
}

export async function broadcastNotification(env: Env, payload: NotificationPayload) {
    if (!env.WEBSOCKET_HUB) return;
    try {
        const id = env.WEBSOCKET_HUB.idFromName("global-hub");
        const hub = env.WEBSOCKET_HUB.get(id);
        const request = new Request("http://dummy/broadcast", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        await hub.fetch(request as any).catch(() => { });
    } catch (e) {
        console.error("Failed to trigger notification broadcast", e);
    }
}
