/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Permission } from '@/types/permissions';

export type Subscription = 'Free' | 'Pro' | 'Ultime';

export const PERMISSIONS_MATRIX: Record<Subscription, Permission[]> = {
    Free: [
        Permission.READ_API,
        Permission.WRITE_API,
        Permission.EXERCISES_READ,
        Permission.EXERCISES_CREATE,
        Permission.VIDEOS_ANALYZE, // 3/jour
        Permission.SESSIONS_CREATE, // 5 max
        Permission.MATCHES_CREATE, // 2/mois
        Permission.MATCHES_CONTACT,
    ],

    Pro: [
        // Toutes les permissions Free
        Permission.READ_API,
        Permission.WRITE_API,
        Permission.EXERCISES_READ,
        Permission.EXERCISES_CREATE,
        Permission.VIDEOS_ANALYZE,
        Permission.SESSIONS_CREATE,
        Permission.MATCHES_CREATE,
        Permission.MATCHES_CONTACT,

        // Pro specific
        Permission.EXERCISES_READ_ALL,
        Permission.EXERCISES_SHARE,
        Permission.VIDEOS_ANALYZE_LONG,
        Permission.SESSIONS_TEMPLATE,
        Permission.SESSIONS_SHARE,
        Permission.MATCHES_PREMIUM,
        Permission.EXPORT_PDF,
        Permission.SHARE_LIBRARY,
    ],

    Ultime: [
        // Toutes les permissions Pro
        Permission.READ_API,
        Permission.WRITE_API,
        Permission.EXERCISES_READ,
        Permission.EXERCISES_CREATE,
        Permission.VIDEOS_ANALYZE,
        Permission.SESSIONS_CREATE,
        Permission.MATCHES_CREATE,
        Permission.MATCHES_CONTACT,
        Permission.EXERCISES_READ_ALL,
        Permission.EXERCISES_SHARE,
        Permission.VIDEOS_ANALYZE_LONG,
        Permission.SESSIONS_TEMPLATE,
        Permission.SESSIONS_SHARE,
        Permission.MATCHES_PREMIUM,
        Permission.EXPORT_PDF,
        Permission.SHARE_LIBRARY,

        // Ultime specific
        Permission.VIDEOS_ANALYZE_BATCH,
        Permission.VIDEOS_PRIORITY,
        Permission.EXPORT_VIDEO,
    ],
};
