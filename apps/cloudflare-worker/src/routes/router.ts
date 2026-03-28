/// <reference types="@cloudflare/workers-types" />
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

/// <reference types="@cloudflare/workers-types" />
import type { ExecutionContext } from "@cloudflare/workers-types";
/* global URLPattern */
import { JWTPayload } from "jose";

import { checkPermissions } from "../auth0";
import { Env } from "../types/env";
import { BlockedUserRow } from "../types";
import { ErrorHandler } from "../utils/error-handler";

// ── KV cache TTLs (seconds) ──────────────────────────────────────────────────
const BLOCK_CACHE_TTL_S = 5 * 60;   // 5 minutes
const STRICT_RL_WINDOW_S = 5 * 60;  // 5 minutes

/**
 * Delete the distributed block-status cache entry for a user.
 * Call this after blocking/unblocking so the next request re-checks D1.
 */
export async function invalidateBlockCache(auth0Sub: string, env: Env): Promise<void> {
	try {
		if (env.KV_CACHE) {
			await env.KV_CACHE.delete(`blocked:${auth0Sub}`);
		}
	} catch (e) {
		console.error('Failed to invalidate block cache in KV:', e);
	}
}

export type AuthenticatedRequest = Request & {
	params: Record<string, string>;
	user?: JWTPayload;
	/** Permissions extracted from the JWT, available in every authenticated route handler. */
	permissions: string[];
	/** If the user is a super admin */
	isAdmin?: boolean;
};

type RouteHandler = (
	request: AuthenticatedRequest,
	env: Env,
	ctx: ExecutionContext,
) => Promise<Response>;

interface Route {
	path: string;
	method: string;
	handler: RouteHandler;
	permission?: string;
	// Compiled URLPattern for advanced matching (Rocket-style <> syntax)
	compiled?: URLPattern | null;
}

export class Router {
	jwtPayload: JWTPayload = {};
	userPermissions: string[] = [];
	routes: Route[] = [];
	corsHeaders: Record<string, string>;

	constructor(env: Env) {
		this.corsHeaders = {
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://kdufoot.com",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Content-Type": "application/json",
		};
	}

	get(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({
			...this.compileRoute(path),
			path,
			method: "GET",
			handler,
			permission,
		});
	}

	post(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({
			...this.compileRoute(path),
			path,
			method: "POST",
			handler,
			permission,
		});
	}

	put(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({
			...this.compileRoute(path),
			path,
			method: "PUT",
			handler,
			permission,
		});
	}

	patch(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({
			...this.compileRoute(path),
			path,
			method: "PATCH",
			handler,
			permission,
		});
	}

	delete(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({
			...this.compileRoute(path),
			path,
			method: "DELETE",
			handler,
			permission,
		});
	}

	private compileRoute(path: string): { compiled?: URLPattern | null } {
		if (!path.includes("<") || !path.includes(">")) return { compiled: null };

		const converted = path
			.replace(/<([a-zA-Z0-9_]+)\.\.>/g, ":$1*")
			.replace(/<([a-zA-Z0-9_]+)>/g, ":$1");

		try {
			const pattern = new URLPattern({ pathname: converted });
			return { compiled: pattern };
		} catch (e) {
			console.warn("Failed to compile route pattern:", converted, e);
			return { compiled: null };
		}
	}

	private addSecurityHeaders(response: Response): Response {
		if (response.status === 101) return response;

		const newHeaders = new Headers(response.headers);
		if (!newHeaders.has("Cache-Control")) {
			newHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
		}
		newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
		newHeaders.set("X-Frame-Options", "DENY");
		newHeaders.set("X-Content-Type-Options", "nosniff");
		newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
		newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), bluetooth=(), usb=(), payment=(), interest-cohort=()");
		
		const reportingEndpoint = "https://kdufoot.report-uri.com/a/d/g"; // Placeholder réaliste GAFA
		newHeaders.set("Report-To", JSON.stringify({
			group: "default",
			max_age: 31536000,
			endpoints: [{ url: reportingEndpoint }],
			include_subdomains: true
		}));

		const csp = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' https://*.locize.com https://*.auth0.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.mathpix.com",
			"img-src 'self' data: https://*.auth0.com https://*.googleusercontent.com https://*.cloudinary.com https://kdufoot.com",
			"connect-src 'self' https://*.auth0.com https://maps.googleapis.com https://*.locize.com wss://api.kdufoot.com",
			"font-src 'self' https://fonts.gstatic.com https://cdn.mathpix.com",
			"worker-src 'self' blob:",
			"frame-ancestors 'none'",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"upgrade-insecure-requests",
			`report-to default; report-uri ${reportingEndpoint}`
		].join("; ");

		newHeaders.set("Content-Security-Policy", csp);
		
		return new Response(response.body, { 
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(newHeaders)
		});
	}

	async handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === "OPTIONS") {
			return this.addSecurityHeaders(new Response(null, {
				status: 204,
				headers: {
					...this.corsHeaders,
					"Access-Control-Allow-Credentials": "true",
				},
			}));
		}

		const url = new URL(request.url);
		const { pathname } = url;

		try {
			const ip = request.headers.get("CF-Connecting-IP") || "unknown";
			const userId = this.jwtPayload.sub || "anonymous";
			const endpoint = pathname;
			const rateLimitKey = `${ip}:${userId}:${endpoint}`;

			const isSensitiveParams = pathname.startsWith("/api/contact") || pathname.startsWith("/api/register") || pathname.startsWith("/api/auth") || pathname.startsWith("/api/clubs/") || pathname.startsWith("/api/calendar/");
			if (isSensitiveParams && env.KV_CACHE) {
				const pathParts = pathname.split('/').filter(Boolean);
				const endpointGroup = pathParts.slice(0, 2).join(':');
				const strictKey = `rl:strict:${ip}:${endpointGroup}`;
				const maxRequests = pathname.startsWith("/api/clubs/") ? 30 : 5;
				const entry = await env.KV_CACHE.get<{ count: number }>(strictKey, 'json');
				if (entry && entry.count >= maxRequests) {
					return this.addSecurityHeaders(new Response(
						JSON.stringify({ error: `429 Too Many Requests - Strict rate limit exceeded for ${pathname}` }),
						{
							status: 429,
							headers: { ...this.corsHeaders, "Retry-After": "300" }
						}
					));
				}
				const newCount = (entry?.count || 0) + 1;
				ctx.waitUntil(env.KV_CACHE.put(strictKey, JSON.stringify({ count: newCount }), { expirationTtl: STRICT_RL_WINDOW_S }));
			}

			if (env.RATE_LIMITER) {
				const { success } = await env.RATE_LIMITER.limit({ key: rateLimitKey });
				if (!success) {
					return this.addSecurityHeaders(new Response(
						JSON.stringify(`429 Failure – rate limit exceeded for ${pathname}`),
						{
							status: 429,
							headers: {
								...this.corsHeaders,
								"X-RateLimit-Limit": "10",
								"X-RateLimit-Remaining": "0",
								"X-RateLimit-Reset": "60",
								"Retry-After": "60",
							},
						},
					));
				}
			}
		} catch (e) {
			console.error("Rate limiter error:", e);
		}

		for (const route of this.routes) {
			if (route.method !== request.method) continue;

			let match: Record<string, string> | null = null;

			if (route.compiled) {
				try {
					const urlObj = new URL(request.url);
					const res = route.compiled.exec(urlObj);
					if (res && res.pathname && res.pathname.groups) {
						for (const [k, v] of Object.entries(res.pathname.groups)) {
							if (v !== undefined) {
								(match || (match = {}))[k] = v;
							}
						}
					}
				} catch (e) {
					console.warn("Error matching URLPattern for route:", route.path, e);
				}
			}

			if (!match) {
				match = this.matchPath(route.path, pathname);
			}

			if (!match) continue;

			if (route.permission !== undefined) {
				if (!request.headers.has("Authorization")) {
					return ErrorHandler.unauthorized(this.corsHeaders);
				}

				const token = request.headers.get("Authorization")?.split(" ")[1];
				if (!token) {
					return ErrorHandler.unauthorized(this.corsHeaders);
				}

				const { access, payload, permissions } = await checkPermissions(
					token,
					route.permission,
					env,
				);

				this.userPermissions = permissions;
				this.jwtPayload = payload;

				if (!access) {
					return ErrorHandler.forbidden(this.corsHeaders);
				}

				(request as AuthenticatedRequest).user = payload;
				(request as AuthenticatedRequest).permissions = permissions;

				const userId = payload.sub;
				if (userId) {
					try {
						let blocked = false;
						let blockReason: string | null = null;

						if (env.KV_CACHE) {
							const kvBlockKey = `blocked:${userId}`;
							const cachedBlock = await env.KV_CACHE.get<{ isBlocked: boolean; blockReason: string | null }>(kvBlockKey, 'json');
							if (cachedBlock !== null) {
								blocked = cachedBlock.isBlocked;
								blockReason = cachedBlock.blockReason;
							} else {
								const dbUser = await env.DB.prepare('SELECT is_blocked, block_reason FROM users WHERE auth0_sub = ?').bind(userId).first<BlockedUserRow>();
								blocked = !!(dbUser && dbUser.is_blocked);
								blockReason = dbUser?.block_reason ?? null;
								ctx.waitUntil(env.KV_CACHE.put(kvBlockKey, JSON.stringify({ isBlocked: blocked, blockReason }), { expirationTtl: BLOCK_CACHE_TTL_S }));
							}
						} else {
							const dbUser = await env.DB.prepare('SELECT is_blocked, block_reason FROM users WHERE auth0_sub = ?').bind(userId).first<BlockedUserRow>();
							blocked = !!(dbUser && dbUser.is_blocked);
							blockReason = dbUser?.block_reason ?? null;
						}

						if (blocked) {
							return this.addSecurityHeaders(new Response(
								JSON.stringify({
									success: false,
									error: "Votre compte a été suspendu pour le motif suivant : " + (blockReason || "Aucun motif spécifié"),
									reason: blockReason || "Aucun motif spécifié",
									is_blocked: true
								}),
								{
									status: 403,
									headers: { ...this.corsHeaders },
								},
							));
						}
					} catch (e) {
						console.error("Failed to check block status:", e);
					}
				}
			}

			(request as AuthenticatedRequest).params = match;

			try {
				const response = await route.handler(
					request as AuthenticatedRequest,
					env,
					ctx,
				);
				return this.addSecurityHeaders(response);
			} catch (error: unknown) {
				return ErrorHandler.handle(error, this.corsHeaders);
			}
		}

		return Response.json(
			{ success: false, error: "Route non trouvée" },
			{ 
				status: 404, 
				headers: { 
					...this.corsHeaders,
					"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
					"X-Content-Type-Options": "nosniff"
				} 
			},
		);
	}

	private matchPath(
		routePath: string,
		pathname: string,
	): Record<string, string> | null {
		const routeParts = routePath.split("/");
		const pathParts = pathname.split("/");

		if (routeParts.length !== pathParts.length) {
			return null;
		}

		const params: Record<string, string> = {};

		for (let i = 0; i < routeParts.length; i++) {
			const routePart = routeParts[i];
			const pathPart = pathParts[i];

			if (routePart.startsWith(":")) {
				const paramName = routePart.slice(1);
				params[paramName] = pathPart;
				continue;
			}

			if (routePart !== pathPart) {
				return null;
			}
		}

		return params;
	}
}
