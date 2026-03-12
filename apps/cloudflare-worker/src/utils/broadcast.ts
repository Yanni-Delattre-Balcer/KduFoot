import { Env } from "../types/env";
import { sendPushNotification } from "./push";

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
    | 'REQUEST_CANCELLED'
    | 'NEW_MATCH_NEARBY'
    | 'USER_BANNED'
    | 'USER_UNBANNED';

export interface NotificationPayload {
    type: 'NOTIFICATION';
    notificationType: NotificationType;
    targetUserId?: string; // Auth0 Sub (auth0|...)
    targetUserIds?: string[]; // List of Auth0 Subs for bulk push
    targetClubId?: string; // E.g., for "NEW_MATCH_NEARBY"
    message: string;
    actionUrl?: string;
    data?: any;
}

// Notification types that should trigger a native push notification
const PUSH_NOTIFICATION_TYPES: NotificationType[] = [
    'ENROLLMENT_ACCEPTED',
    'ENROLLMENT_REFUSED',
    'MATCH_MODIFIED',
    'MATCH_CANCELLED',
    'NEW_APPLICANT',
];

export async function broadcastNotification(env: Env, payload: NotificationPayload) {
    // 1. WebSocket broadcast (existing behaviour — broadcast to ALL, clients filter)
    if (env.WEBSOCKET_HUB) {
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

    // 2. Native Push Notification (additive — only for targeted events)
    if (
        (payload.targetUserId || (payload.targetUserIds && payload.targetUserIds.length > 0)) &&
        PUSH_NOTIFICATION_TYPES.includes(payload.notificationType) &&
        env.VAPID_PUBLIC_KEY &&
        env.VAPID_PRIVATE_KEY
    ) {
        const recipients = payload.targetUserIds || [payload.targetUserId!];

        for (const recipientSub of recipients) {
            try {
                // Look up the target user's push subscription in D1 using auth0_sub
                const row = await env.DB.prepare(
                    'SELECT push_subscription FROM users WHERE auth0_sub = ?'
                ).bind(recipientSub).first<{ push_subscription: string | null }>();

                if (row?.push_subscription) {
                    const subscription = JSON.parse(row.push_subscription);

                    const pushPayload = {
                        title: 'Kdufoot',
                        body: payload.message,
                        icon: '/logo.png',
                        url: payload.actionUrl || '/dashboard',
                    };

                    const success = await sendPushNotification(subscription, pushPayload, env);

                    // If subscription expired, clean it from DB
                    if (!success) {
                        await env.DB.prepare(
                            'UPDATE users SET push_subscription = NULL WHERE auth0_sub = ?'
                        ).bind(recipientSub).run().catch(() => { });
                    }
                }
            } catch (e) {
                // Push is best-effort, never block the main flow
                console.error(`Failed to send push notification to ${recipientSub}:`, e);
            }
        }
    }
}

