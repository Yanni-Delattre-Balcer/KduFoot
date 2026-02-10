
export enum Permission {
    // Base
    READ_API = 'read:api',
    WRITE_API = 'write:api',

    // Exercices
    EXERCISES_READ = 'exercises:read',
    EXERCISES_READ_ALL = 'exercises:read:all',
    EXERCISES_CREATE = 'exercises:create',
    EXERCISES_UPDATE = 'exercises:update',
    EXERCISES_DELETE = 'exercises:delete',
    EXERCISES_SHARE = 'exercises:share',

    // Vidéos
    VIDEOS_ANALYZE = 'videos:analyze',
    VIDEOS_ANALYZE_LONG = 'videos:analyze:long',
    VIDEOS_ANALYZE_BATCH = 'videos:analyze:batch',
    VIDEOS_PRIORITY = 'videos:priority',

    // Séances
    SESSIONS_CREATE = 'sessions:create',
    SESSIONS_ADAPT = 'sessions:adapt',
    SESSIONS_TEMPLATE = 'sessions:template',
    SESSIONS_SHARE = 'sessions:share',

    // Matchs
    MATCHES_CREATE = 'matches:create',
    MATCHES_PREMIUM = 'matches:premium',
    MATCHES_CONTACT = 'matches:contact',

    // Export
    EXPORT_PDF = 'export:pdf',
    EXPORT_VIDEO = 'export:video',
    SHARE_LIBRARY = 'share:library',

    // Admin
    ADMIN_USERS = 'admin:users',
    ADMIN_EXERCISES = 'admin:exercises',
    ADMIN_MATCHES = 'admin:matches',
    ADMIN_ANALYTICS = 'admin:analytics',
    ADMIN_BILLING = 'admin:billing',
    COACH_CERTIFIED = 'coach:certified',
}

export interface PermissionCheck {
    hasPermission: boolean;
    reason?: string;
    quota?: QuotaInfo;
}

export interface QuotaInfo {
    current: number;
    limit: number;
    resetAt?: string;
}
