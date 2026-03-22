import { vi } from "vitest";

// Mock Cloudflare Workers specific modules
vi.mock("cloudflare:workers", () => ({
    DurableObject: class {
        constructor(public state: any, public env: any) {}
    }
}));

// Mock global Cloudflare constants/classes if needed
if (typeof (globalThis as any).WebSocketPair === 'undefined') {
    (globalThis as any).WebSocketPair = class {
        0 = {} as any;
        1 = {} as any;
    };
}

// Common mock implementation for D1 Database
const mockD1PreparedStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 }, success: true })
};

export const mockEnv = {
    DB: {
        prepare: vi.fn().mockReturnValue(mockD1PreparedStatement),
        batch: vi.fn().mockResolvedValue([]),
        exec: vi.fn().mockResolvedValue({ count: 1, duration: 1 })
    },
    KV_CACHE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
    },
    RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 })
    },
    WEBSOCKET_HUB: {
        idFromName: vi.fn().mockReturnValue('123'),
        get: vi.fn().mockReturnValue({
            fetch: vi.fn().mockResolvedValue(new Response())
        })
    },
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "https://test-api",
    CORS_ORIGIN: "http://localhost:5173",
    ENVIRONMENT: "test",
    JWT_SECRET: "test-secret",
    GOOGLE_MAPS_API_KEY: "test-key",
    VAPID_PUBLIC_KEY: "test",
    VAPID_PRIVATE_KEY: "test"
};
