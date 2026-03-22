import { Env } from "../types/env";
import { SignJWT, importPKCS8 } from "jose";

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
    data?: Record<string, unknown>;
}


export async function broadcastNotification(env: Env, payload: NotificationPayload) {
    // WebSocket broadcast (existing behaviour — broadcast to ALL, clients filter)
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

    // Web Push (Targeted)
    if (payload.targetUserId || (payload.targetUserIds && payload.targetUserIds.length > 0)) {
        const subs = payload.targetUserId ? [payload.targetUserId] : payload.targetUserIds!;
        for (const sub of subs) {
            try {
                const user = await env.DB.prepare('SELECT push_subscription FROM users WHERE auth0_sub = ?').bind(sub).first<{ push_subscription: string | null }>();
                if (user?.push_subscription) {
                    const subscription = JSON.parse(user.push_subscription);
                    await sendWebPush(env, subscription, {
                        title: 'KduFoot',
                        body: payload.message,
                        data: {
                            ...payload.data,
                            url: payload.actionUrl || '/'
                        }
                    });
                }
            } catch (e) {
                console.error(`Failed to send push to ${sub}`, e);
            }
        }
    }
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

async function sendWebPush(env: Env, subscription: PushSubscription, payload: Record<string, unknown>) {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        console.warn("VAPID keys missing, skipping push");
        return;
    }

    try {
        const endpoint = new URL(subscription.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;

        // Create VAPID JWT
        const jwt = await new SignJWT({
            aud: audience,
            exp: Math.floor(Date.now() / 1000) + 12 * 3600,
            sub: "mailto:contact@kdufoot.com"
        })
            .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
            .sign(await importPKCS8(env.VAPID_PRIVATE_KEY, 'ES256'));

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'TTL': '86400',
                'Urgency': 'high',
                'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
                'Content-Type': payload ? 'application/json' : 'text/plain',
            },
            body: payload ? JSON.stringify(payload) : null
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`Push subscription error at ${endpoint.host}: ${response.status} ${error}`);
            if (response.status === 410 || response.status === 404) {
                console.log(`Unregistering invalid subscription for ${subscription.endpoint}`);
                // Optional: clear the subscription in DB here if we had the user ID
            }
        } else {
            console.log(`Push sent successfully to ${endpoint.host}`);
        }
    } catch (e) {
        console.error("Error sending Web Push:", e);
    }
}

