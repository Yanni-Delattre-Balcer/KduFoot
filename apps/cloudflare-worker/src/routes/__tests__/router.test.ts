import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from '../router';
import { mockEnv } from '../../../test/setup';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, path: string, headers: Record<string, string> = {}): Request {
    const url = `https://kdufoot.com${path}`;
    return new Request(url, { method, headers });
}

function makeAuthRequest(method: string, path: string, token = 'valid-token'): Request {
    return makeRequest(method, path, { Authorization: `Bearer ${token}` });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Router', () => {
    let router: Router;

    beforeEach(() => {
        vi.clearAllMocks();
        router = new Router(mockEnv as any);
    });

    // ── CORS ─────────────────────────────────────────────────────────────────

    describe('OPTIONS (CORS preflight)', () => {
        it('should return 204 with CORS headers for OPTIONS requests', async () => {
            const request = makeRequest('OPTIONS', '/api/matches');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.status).toBe(204);
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        });
    });

    // ── 404 ──────────────────────────────────────────────────────────────────

    describe('404 Not Found', () => {
        it('should return 404 for unknown routes', async () => {
            const request = makeRequest('GET', '/api/nonexistent-route-xyz');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.status).toBe(404);
            const body = await response.json() as { success: boolean; error: string };
            expect(body.success).toBe(false);
        });

        it('should include security headers on 404 responses', async () => {
            const request = makeRequest('GET', '/api/nonexistent-route-xyz');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        });
    });

    // ── Security Headers ─────────────────────────────────────────────────────

    describe('Security headers', () => {
        it('should add HSTS header to responses', async () => {
            router.get('/test-security', async () => new Response('ok', { status: 200 }));
            const request = makeRequest('GET', '/test-security');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
        });

        it('should add X-Frame-Options: DENY', async () => {
            router.get('/test-frame', async () => new Response('ok', { status: 200 }));
            const request = makeRequest('GET', '/test-frame');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        });

        it('should add Content-Security-Policy header', async () => {
            router.get('/test-csp', async () => new Response('ok', { status: 200 }));
            const request = makeRequest('GET', '/test-csp');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
        });

        it('should add Cache-Control: no-store when not already set', async () => {
            router.get('/test-cache', async () => new Response('ok', { status: 200 }));
            const request = makeRequest('GET', '/test-cache');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.headers.get('Cache-Control')).toContain('no-store');
        });
    });

    // ── Route Matching ────────────────────────────────────────────────────────

    describe('Route matching', () => {
        it('should match exact paths', async () => {
            router.get('/api/health', async () => Response.json({ ok: true }));
            const request = makeRequest('GET', '/api/health');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);
            expect(response.status).toBe(200);
        });

        it('should extract path parameters with <param> syntax', async () => {
            let capturedParams: Record<string, string> = {};
            router.get('/api/items/<id>', async (req) => {
                capturedParams = req.params;
                return Response.json({ id: req.params.id });
            });

            const request = makeRequest('GET', '/api/items/abc-123');
            const ctx = { waitUntil: vi.fn() } as any;

            await router.handleRequest(request, mockEnv as any, ctx);
            expect(capturedParams.id).toBe('abc-123');
        });

        it('should not match routes with different HTTP method', async () => {
            router.post('/api/only-post', async () => Response.json({ ok: true }));
            const request = makeRequest('GET', '/api/only-post');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);
            expect(response.status).toBe(404);
        });

        it('should support all HTTP methods (GET, POST, PUT, PATCH, DELETE)', async () => {
            for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
                const r = new Router(mockEnv as any);
                r[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](
                    `/api/test-${method.toLowerCase()}`,
                    async () => Response.json({ method })
                );
                const request = makeRequest(method, `/api/test-${method.toLowerCase()}`);
                const ctx = { waitUntil: vi.fn() } as any;
                const response = await r.handleRequest(request, mockEnv as any, ctx);
                expect(response.status).toBe(200);
            }
        });
    });

    // ── Permission / Authentication ───────────────────────────────────────────

    describe('Authentication middleware', () => {
        it('should return 401 when Authorization header is missing on protected route', async () => {
            router.get('/api/protected', async () => Response.json({ ok: true }), 'read:api');
            const request = makeRequest('GET', '/api/protected'); // No Authorization header
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);
            expect(response.status).toBe(401);
        });

        it('should return 401 when Authorization header has no token', async () => {
            router.get('/api/protected', async () => Response.json({ ok: true }), 'read:api');
            const request = makeRequest('GET', '/api/protected', { Authorization: 'Bearer ' });
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);
            expect(response.status).toBe(401);
        });
    });

    // ── Rate Limiting ─────────────────────────────────────────────────────────

    describe('Rate limiting', () => {
        it('should return 429 when Cloudflare rate limiter rejects request', async () => {
            const rateLimitedEnv = {
                ...mockEnv,
                RATE_LIMITER: {
                    limit: vi.fn().mockResolvedValue({ success: false }),
                },
            };
            const r = new Router(rateLimitedEnv as any);
            r.get('/api/rate-limited', async () => Response.json({ ok: true }));
            const request = makeRequest('GET', '/api/rate-limited');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await r.handleRequest(request, rateLimitedEnv as any, ctx);
            expect(response.status).toBe(429);
        });

        it('should return 429 on strict KV rate limit for sensitive endpoints', async () => {
            // Create a KV mock that actually stores values between get/put calls
            const kvStore = new Map<string, string>();
            const kvMock = {
                get: vi.fn(async (key: string) => {
                    const val = kvStore.get(key);
                    return val ? JSON.parse(val) : null;
                }),
                put: vi.fn(async (key: string, value: string) => {
                    kvStore.set(key, value);
                }),
                delete: vi.fn().mockResolvedValue(undefined),
            };
            const envWithKV = { ...mockEnv, KV_CACHE: kvMock };
            const r = new Router(envWithKV as any);
            r.get('/api/auth/test', async () => Response.json({ ok: true }));
            const ctx = { waitUntil: vi.fn((p: Promise<unknown>) => p) } as any;

            // Make 7 requests (limit is 5 for /api/auth/)
            let lastResponse: Response | null = null;
            for (let i = 0; i < 7; i++) {
                const request = makeRequest('GET', '/api/auth/test', { 'CF-Connecting-IP': '1.2.3.4' });
                lastResponse = await r.handleRequest(request, envWithKV as any, ctx);
            }

            expect(lastResponse?.status).toBe(429);
        });
    });

    // ── Error Handling ────────────────────────────────────────────────────────

    describe('Error handling', () => {
        it('should catch errors thrown by handlers and return 500', async () => {
            router.get('/api/throws', async () => {
                throw new Error('Unexpected database error with sensitive info');
            });
            const request = makeRequest('GET', '/api/throws');
            const ctx = { waitUntil: vi.fn() } as any;

            const response = await router.handleRequest(request, mockEnv as any, ctx);

            expect(response.status).toBe(500);
            const body = await response.json() as { error: string };
            // Should NOT leak the actual error message
            expect(body.error).not.toContain('database');
        });
    });

    // ── Cache Invalidation ────────────────────────────────────────────────────

    describe('invalidateBlockCache', () => {
        it('should export invalidateBlockCache function', async () => {
            const { invalidateBlockCache } = await import('../router');
            expect(typeof invalidateBlockCache).toBe('function');
            // Should not throw
            const mockEnv = { KV_CACHE: { delete: async () => {} } } as any;
            await expect(invalidateBlockCache('auth0|test123', mockEnv)).resolves.not.toThrow();
        });
    });
});
