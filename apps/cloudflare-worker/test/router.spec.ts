/**
 * MIT License
 *
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { describe, test, expect, vi, beforeEach, Mock } from "vitest";
import { Router } from "../src/routes/router";

// Mock auth0.checkPermissions used by Router
vi.mock("../src/auth0", () => {
    const fn = vi.fn().mockResolvedValue({ access: false, payload: {}, permissions: [] });
    return { checkPermissions: fn };
});

import { mockEnv } from "./setup";
import { checkPermissions } from "../src/auth0";

const makeRequest = (method = "GET", url = "https://example.test/", headers: Record<string, string> = {}) => {
    return new Request(url, { method, headers });
};

const makeEnv = (overrides: Partial<any> = {}): any => ({
    ...mockEnv,
    CORS_ORIGIN: "*",
    READ_PERMISSION: "read:api",
    WRITE_PERMISSION: "write:api",
    ADMIN_PERMISSION: "admin:api",
    API_BASE_URL: "http://localhost:8787/api",
    ...overrides,
});

const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

beforeEach(() => {
    ((checkPermissions as unknown) as Mock).mockReset();
});

describe("Router basic behavior", () => {
    test("OPTIONS returns 204", async () => {
        const router = new Router(makeEnv());
        const res = await router.handleRequest(makeRequest("OPTIONS", "https://example.test/"), makeEnv(), ctx);
        expect(res.status).toBe(204);
    });

    test("Unknown path returns 404", async () => {
        const router = new Router(makeEnv());
        const res = await router.handleRequest(makeRequest("GET", "https://example.test/unknown"), makeEnv(), ctx);
        expect(res.status).toBe(404);
    });

    test("Rate limiter can return 429", async () => {
        const env = makeEnv({ RATE_LIMITER: { limit: async () => ({ success: false }) } as any });
        const router = new Router(env);
        const res = await router.handleRequest(makeRequest("GET", "https://example.test/any"), env, ctx);
        expect(res.status).toBe(429);
    });

    test("Protected route without Authorization header returns 401", async () => {
        const router = new Router(makeEnv());
        router.get("/private", async () => new Response(JSON.stringify({ success: true })), makeEnv().READ_PERMISSION);
        const res = await router.handleRequest(makeRequest("GET", "https://example.test/private"), makeEnv(), ctx);
        expect(res.status).toBe(401);
    });

    test("Protected route with valid token and permission returns 200", async () => {
        ((checkPermissions as unknown) as Mock).mockResolvedValue({ access: true, payload: { sub: "user|1234" }, permissions: ["read:api"] });

        const env = makeEnv();
        const router = new Router(env);
        router.get(
            "/private",
            async (req) => new Response(JSON.stringify({ ok: true, user: (req as any).user?.sub })),
            env.READ_PERMISSION,
        );

        const req = makeRequest("GET", "https://example.test/private", { Authorization: "Bearer faketoken" });
        const res = await router.handleRequest(req, env, ctx);
        const body = await res.json() as any;
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.user).toBe("user|1234");

        // The router should record the user's permissions (returned by checkPermissions)
        expect(router.userPermissions).toEqual(["read:api"]);
    });

    test("Rocket-style <param> is supported and exposes request.params", async () => {
        const env = makeEnv();
        const router = new Router(env);
        router.get(
            "/api/get/<user>",
            async (req) => new Response(JSON.stringify({ ok: true, params: (req as any).params })),
        );

        const req = makeRequest("GET", "https://example.test/api/get/alice");
        const res = await router.handleRequest(req, env, ctx);
        const body = await res.json() as any;
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.params).toEqual({ user: "alice" });
    });

    test("Rocket-style catch-all <path..> captures remainder", async () => {
        const env = makeEnv();
        const router = new Router(env);
        router.get(
            "/files/<path..>",
            async (req) => new Response(JSON.stringify({ ok: true, params: (req as any).params })),
        );

        const req = makeRequest("GET", "https://example.test/files/a/b/c.txt");
        const res = await router.handleRequest(req, env, ctx);
        const body = await res.json() as any;
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        // catch-all returns joined path
        expect(body.params).toEqual({ path: "a/b/c.txt" });
    });

    test("checkPermissions returns permissions array and router stores it", async () => {
        // Simulate checkPermissions returning permissions
        ((checkPermissions as unknown) as Mock).mockResolvedValue({ access: true, payload: { sub: "user|5678" }, permissions: ["read:api"] });

        const env = makeEnv();
        const router = new Router(env);
        router.get(
            "/private2",
            async (req) => new Response(JSON.stringify({ ok: true, user: (req as any).user?.sub })),
            env.READ_PERMISSION,
        );

        const req = makeRequest("GET", "https://example.test/private2", { Authorization: "Bearer faketoken2" });
        const res = await router.handleRequest(req, env, ctx);
        const body = await res.json() as any;
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.user).toBe("user|5678");
        expect(router.userPermissions).toEqual(["read:api"]);
    });
});
