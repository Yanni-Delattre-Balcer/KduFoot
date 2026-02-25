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

import { decodeJwt } from "jose";

import { Router } from "./router";
import { setupUserRoutes } from "./users";
import { setupClubRoutes } from "./clubs";
import { setupExerciseRoutes } from "./exercises";
import { setupSessionRoutes } from "./sessions";
import { setupMatchRoutes } from "./matches";
import { Env } from "../types/env";

export const setupRoutes = (router: Router, env: Env) => {
	/**
	 * POST /api/__auth0/token
	 *
	 * Demande un token Auth0 Management API via le flux client_credentials.
	 * Le token est mis en cache dans KV pour limiter les appels à Auth0.
	 * Nécessite la permission env.ADMIN_AUTH0_PERMISSION (auth0:admin:api).
	 */
	router.post(
		"/api/__auth0/token",
		async () => {
			try {
				if (
					!env.AUTH0_MANAGEMENT_API_CLIENT_ID ||
					!env.AUTH0_MANAGEMENT_API_CLIENT_SECRET ||
					!env.AUTH0_DOMAIN
				) {
					return new Response(
						JSON.stringify({ success: false, error: "Configuration Auth0 manquante" }),
						{
							status: 500,
							headers: { ...router.corsHeaders, "Content-Type": "application/json" },
						},
					);
				}

				const tokenUrl = `https://${env.AUTH0_DOMAIN}/oauth/token`;
				const audience = `https://${env.AUTH0_DOMAIN}/api/v2/`;
				const cacheKey = `auth0:management_token`;

				// Vérification du cache KV d'abord
				if (env.KV_CACHE) {
					try {
						const cached = await env.KV_CACHE.get(cacheKey);
						if (cached) {
							let parsed: { token?: string; exp?: number } | null = null;
							try { parsed = JSON.parse(cached); } catch (_) { /* token brut */ }

							const token = parsed?.token ?? cached;
							let exp = parsed?.exp;

							if (!exp && token) {
								try {
									const decoded = decodeJwt(token);
									exp = (decoded?.exp as number) || undefined;
								} catch (_) { exp = undefined; }
							}

							if (exp) {
								const now = Math.floor(Date.now() / 1000);
								if (exp > now + 5) {
									// Token en cache encore valide → on le retourne directement
									return new Response(
										JSON.stringify({
											access_token: token,
											token_type: "Bearer",
											expires_in: exp - now,
											from_cache: true,
										}),
										{
											status: 200,
											headers: { ...router.corsHeaders, "Content-Type": "application/json" },
										},
									);
								}
							}
						}
					} catch (e) {
						console.warn("KV_CACHE inaccessible, demande d'un nouveau token", String(e));
					}
				}

				// Appel Auth0 pour obtenir un nouveau token
				const resp = await fetch(tokenUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						client_id: env.AUTH0_MANAGEMENT_API_CLIENT_ID,
						client_secret: env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
						audience,
						grant_type: "client_credentials",
					}),
				});

				if (!resp.ok) {
					const errorText = await resp.text();
					return new Response(
						JSON.stringify({ success: false, error: `Échec Auth0: ${errorText}` }),
						{
							status: 500,
							headers: { ...router.corsHeaders, "Content-Type": "application/json" },
						},
					);
				}

				const data = (await resp.json()) as {
					access_token?: string;
					token_type?: string;
					expires_in?: number;
					[key: string]: unknown;
				};

				if (!data?.access_token) {
					return new Response(
						JSON.stringify({ success: false, error: "Réponse Auth0 invalide : pas d'access_token" }),
						{
							status: 500,
							headers: { ...router.corsHeaders, "Content-Type": "application/json" },
						},
					);
				}

				// Mise en cache du token dans KV
				if (env.KV_CACHE && data.access_token) {
					try {
						const tokenStr = data.access_token as string;
						const now = Math.floor(Date.now() / 1000);
						let exp: number | undefined;

						if (typeof data.expires_in === "number") {
							exp = now + Math.floor(data.expires_in);
						} else {
							try {
								const decoded = decodeJwt(tokenStr);
								exp = (decoded?.exp as number) || undefined;
							} catch (_) { exp = undefined; }
						}

						if (exp && exp > now + 5) {
							await env.KV_CACHE.put(
								cacheKey,
								JSON.stringify({ token: tokenStr, exp }),
								{ expiration: exp },
							);
						}
					} catch (e) {
						console.warn("Échec mise en cache KV_CACHE", String(e));
					}
				}

				return new Response(
					JSON.stringify({
						access_token: data.access_token,
						token_type: data.token_type,
						expires_in: data.expires_in,
						from_cache: false,
					}),
					{
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" },
					},
				);
			} catch (error) {
				return new Response(
					JSON.stringify({ success: false, error: String(error) }),
					{
						status: 500,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" },
					},
				);
			}
		},
		env.ADMIN_AUTH0_PERMISSION,
	);
	setupUserRoutes(router, env);
	setupClubRoutes(router, env);
	setupExerciseRoutes(router, env);
	setupSessionRoutes(router, env);
	setupMatchRoutes(router, env);
	// Preserve the original root response for backwards compatibility
	router.get("/", async () => {
		return new Response("Hello World!", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	});

	// Simple health check (public)
	router.get("/health", async () => {
		return new Response(JSON.stringify({ success: true, status: "ok" }), {
			status: 200,
			headers: { ...router.corsHeaders, "Content-Type": "application/json" },
		});
	});

	// Debug D1 (Public for now, carefully)
	router.get("/api/debug-db", async () => {
		try {
			const count = await env.DB.prepare('SELECT count(*) as count FROM users').first();
			return new Response(JSON.stringify({
				success: true,
				database: "Connected",
				user_count: (count as any)?.count,
				env_id: env.CLOUDFLARE_DATABASE_ID // This might be undefined unless injected
			}), {
				status: 200,
				headers: { ...router.corsHeaders, "Content-Type": "application/json" },
			});
		} catch (e: any) {
			return new Response(JSON.stringify({ success: false, error: e.message }), {
				status: 500,
				headers: { ...router.corsHeaders, "Content-Type": "application/json" },
			});
		}
	});

	// Protected ping (requires READ permission)
	router.get(
		"/api/ping",
		async (_request) => {
			return new Response(
				JSON.stringify({ success: true, user: router.jwtPayload.sub || null }),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);

	// Protected /api/get_users (requires READ permission)
	router.get(
		"/api/get_users",
		async (_request) => {
			const user = router.jwtPayload.sub || ""; // Attach the JWT payload to the request for use in the handler

			return new Response(JSON.stringify({ success: true, user }), {
				status: 200,
				headers: { ...router.corsHeaders, "Content-Type": "application/json" },
			});
		},
		env.READ_PERMISSION,
	);

	// Protected /api/get/<user> (requires READ permission)
	router.get(
		"/api/get/<user>",
		async (request) => {
			const { user } = request.params; // Extract the dynamic parameter from the URL
			const sub = router.jwtPayload.sub || ""; // Attach the JWT payload to the request for use in the handler
			const permissions = router.userPermissions; // Get the permissions from the JWT payload
			const token =
				request.headers.get("Authorization")?.replace("Bearer ", "") || "";

			return new Response(
				JSON.stringify({ success: true, user, sub, permissions, token }),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);
};
