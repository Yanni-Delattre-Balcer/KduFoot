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

// Library for working with JSON Web Tokens (JWT)
import { decodeJwt } from "jose";

// Local imports for routing and environment definitions
import { getManagementToken, addPermissionsToUser } from "../auth0";
import { Router } from "./router";
import { setupUserRoutes } from "./users";
import { setupClubRoutes } from "./clubs";
import { setupExerciseRoutes } from "./exercises";
import { setupSessionRoutes } from "./sessions";
import { setupMatchRoutes } from "./matches";
import { Env } from "../types/env";

/**
 * Main function to configure all application routes.
 * It takes a router instance and the environment configuration.
 */
export const setupRoutes = (router: Router, env: Env) => {
	/**
	 * POST /api/__auth0/token
	 *
	 * Requests an Auth0 Management API token via the client_credentials flow.
	 * The token is cached in KV to limit calls to Auth0.
	 * Requires the env.ADMIN_AUTH0_PERMISSION (auth0:admin:api) permission.
	 */
	router.post(
		"/api/__auth0/token",
		async () => {
			try {
				const token = await getManagementToken(env);
				const now = Math.floor(Date.now() / 1000);

				return new Response(
					JSON.stringify({
						access_token: token,
						token_type: "Bearer",
						expires_in: 3600, // Default to 1h, though we could decode it for accuracy
						from_cache: true,   // Simplified: we assume it might be from cache
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

	/**
	 * POST /api/__auth0/autopermissions
	 *
	 * Automatically assigns permissions listed in AUTH0_AUTOMATIC_PERMISSIONS
	 * if the user doesn't already have them.
	 */
	router.post(
		"/api/__auth0/autopermissions",
		async (request) => {
			try {
				const autoPermsStr = env.AUTH0_AUTOMATIC_PERMISSIONS || "";
				if (!autoPermsStr) {
					return new Response(JSON.stringify({ success: true, message: "No automatic permissions configured" }), {
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" },
					});
				}

				const autoPerms = autoPermsStr.split(",").map(p => p.trim()).filter(p => p !== "");
				const currentPerms = router.userPermissions || [];
				const missingPerms = autoPerms.filter(p => !currentPerms.includes(p));

				if (missingPerms.length === 0) {
					return new Response(JSON.stringify({ success: true, message: "User already has all automatic permissions" }), {
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" },
					});
				}

				const userId = router.jwtPayload.sub;
				if (!userId) {
					throw new Error("User ID not found in token");
				}

				await addPermissionsToUser(userId, missingPerms, env);

				return new Response(JSON.stringify({ success: true, added: missingPerms }), {
					status: 200,
					headers: { ...router.corsHeaders, "Content-Type": "application/json" },
				});
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
		/**
		 * Empty string indicator: This route requires a valid JWT (authentication)
		 * but does not require any specific scope/permission to access.
		 */
		"",
	);
	// Sub-section of routes for different domains (users, clubs, etc.)
	setupUserRoutes(router, env);
	setupClubRoutes(router, env);
	setupExerciseRoutes(router, env);
	setupSessionRoutes(router, env);
	setupMatchRoutes(router, env);
	// Preserve the original root response for backwards compatibility
	router.get("/", async () => {
		return new Response("KduFoot API is running", {
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
