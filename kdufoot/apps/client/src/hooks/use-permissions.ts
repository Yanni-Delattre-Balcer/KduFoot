import { useAuth } from '@/authentication';
import { useState, useEffect } from 'react';

// Re-export specific permission enums or use string literals if preferred
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

export function usePermissions() {
    const auth = useAuth();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadPermissions() {
            // If not authenticated, clear permissions
            if (!auth.isAuthenticated) {
                setPermissions([]);
                setIsLoading(false);
                return;
            }

            try {
                const token = await auth.getAccessToken();
                if (token) {
                    // Decode JWT payload (standard structure: header.payload.signature)
                    const payloadPart = token.split('.')[1];
                    if (payloadPart) {
                        const payload = JSON.parse(atob(payloadPart));
                        setPermissions(payload.permissions || []);
                    }
                }
            } catch (error) {
                console.error('Error loading permissions:', error);
                setPermissions([]);
            } finally {
                setIsLoading(false);
            }
        }

        loadPermissions();
    }, [auth.isAuthenticated, auth.user]); // Reload if user context changes

    const hasPermission = (permission: Permission | string): boolean => {
        return permissions.includes(permission);
    };

    return { hasPermission, isLoading, permissions };
}
