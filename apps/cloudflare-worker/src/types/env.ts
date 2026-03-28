
import { D1Database, R2Bucket, KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';

/**
 * The Env interface defines all the external resources and configurations
 * that our Cloudflare Worker can access.
 */
export interface Env {
    // 'Bindings' are direct connections to Cloudflare services
    DB: D1Database; // SQL Database (SQLite based)
    VIDEOS_BUCKET: R2Bucket; // Object Storage (like Amazon S3)
    THUMBNAILS_BUCKET: R2Bucket;
    KV_CACHE: KVNamespace; // Fast global Key-Value storage
    WEBSOCKET_HUB: DurableObjectNamespace; // WebSockets tracking & broadcasting
    RATE_LIMITER: { limit: (options: { key: string }) => Promise<{ success: boolean }> }; // Limits the number of requests to prevent abuse
    PDF_QUEUE: { send: (message: any) => Promise<void> }; // Async queue for heavy tasks

    // Environment variables
    AUTH0_DOMAIN: string;
    AUTH0_CLIENT_ID: string;
    AUTH0_CLIENT_SECRET: string;
    AUTH0_AUDIENCE: string;
    AUTH0_SCOPE: string;
    AUTH0_SUB: string;
    API_BASE_URL: string;
    CORS_ORIGIN: string;
    CLOUDFLARE_DATABASE_ID?: string;

    // Auth0 Management API
    AUTH0_MANAGEMENT_API_CLIENT_ID: string;
    AUTH0_MANAGEMENT_API_CLIENT_SECRET: string;

    // Automatic Permissions
    AUTH0_AUTOMATIC_PERMISSIONS: string;

    // Permissions
    READ_PERMISSION: string;
    WRITE_PERMISSION: string;
    ADMIN_PERMISSION: string;
    BACKUP_PERMISSION: string;
    ADMIN_AUTH0_PERMISSION: string;
    CRYPTOKEN: string;
    AUTH0_TOKEN: string;

    // App specific
    AUTHENTICATION_PROVIDER_TYPE: string;
    DEX_JWKS_ENDPOINT: string;

    // APIs & Models
    GOOGLE_API_KEY: string;
    GEMINI_MODEL: string;

    // Cloudflare
    CLOUDFLARE_ACCOUNT_ID: string;

    // API Gouvernementale (SIRET)
    SIRET_API_URL: string;

    // Google Maps (Distance Matrix)
    GOOGLE_MAPS_API_KEY: string;

    // Web Push (VAPID)
    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_KEY: string;

    SUPER_ADMIN_EMAIL?: string;
    SUPER_ADMIN_ID?: string;

    // SaaS & Monetization
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    FRONTEND_URL: string;

    // Monitoring
    SENTRY_DSN?: string;
}
