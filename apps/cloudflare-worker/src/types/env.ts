
import { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
    // Bindings defined in wrangler.jsonc
    DB: D1Database;
    VIDEOS_BUCKET: R2Bucket;
    THUMBNAILS_BUCKET: R2Bucket;
    KV_CACHE: KVNamespace;
    RATE_LIMITER: any; // RateLimit type not always available in all envs

    // Environment variables
    AUTH0_DOMAIN: string;
    AUTH0_CLIENT_ID: string;
    AUTH0_CLIENT_SECRET: string;
    AUTH0_AUDIENCE: string;
    AUTH0_SCOPE: string;
    AUTH0_SUB: string;
    API_BASE_URL: string;
    CORS_ORIGIN: string;

    // Permissions
    READ_PERMISSION: string;
    WRITE_PERMISSION: string;
    ADMIN_PERMISSION: string;
    BACKUP_PERMISSION: string;
    CRYPTOKEN: string;
    AUTH0_TOKEN: string;

    // App specific
    AUTHENTICATION_PROVIDER_TYPE: string;
    DEX_JWKS_ENDPOINT: string;

    // API Gouvernementale (SIRET)
    SIRET_API_URL: string;

    // Google Maps (Distance Matrix)
    GOOGLE_MAPS_API_KEY: string;
}
