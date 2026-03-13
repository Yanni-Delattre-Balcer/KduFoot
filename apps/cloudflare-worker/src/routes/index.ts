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
import { setupAdminRoutes } from "./admin";
import { Env } from "../types/env";

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Represents a user within the KduFoot ecosystem, synchronized from Auth0 and enriched with local data.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Internal unique identifier for the user (UUID v4).
 *         auth0_sub:
 *           type: string
 *           description: Unique identifier provided by Auth0 (e.g., auth0|xxx).
 *         email:
 *           type: string
 *           description: Primary email address of the user.
 *         firstname:
 *           type: string
 *           description: User's first name.
 *         lastname:
 *           type: string
 *           description: User's last name.
 *         picture:
 *           type: string
 *           description: URL to the user's profile picture.
 *         location:
 *           type: string
 *           description: General location or city of the user.
 *         stadium_address:
 *           type: string
 *           description: Physical address of the user's primary stadium or playground.
 *         siret:
 *           type: string
 *           description: French business identifier (14 digits) for the user's club.
 *         club_id:
 *           type: string
 *           format: uuid
 *           description: Reference ID to the associated Club record.
 *         subscription:
 *           type: string
 *           description: Current subscription level or status of the user.
 *         created_at:
 *           type: integer
 *           description: Unix timestamp of when the user record was created.
 *         updated_at:
 *           type: integer
 *           description: Unix timestamp of the last update to the user record.
 *     Club:
 *       type: object
 *       description: Represents a football club or organization identified by its SIRET number.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Internal unique identifier for the club.
 *         siret:
 *           type: string
 *           description: Unique 14-digit SIRET identifier.
 *         name:
 *           type: string
 *           description: Full official name of the club.
 *         city:
 *           type: string
 *           description: City where the club is located.
 *         address:
 *           type: string
 *           description: Full street address of the club's headquarters or headquarters.
 *         zip:
 *           type: string
 *           description: Zip or postal code.
 *         latitude:
 *           type: number
 *           description: Geographical latitude for mapping.
 *         longitude:
 *           type: number
 *           description: Geographical longitude for mapping.
 *     Exercise:
 *       type: object
 *       description: A training drill or exercise created by a user.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the exercise.
 *         title:
 *           type: string
 *           description: Title or name of the exercise.
 *         description:
 *           type: string
 *           description: Detailed instructions or description of the drill.
 *         category:
 *           type: string
 *           description: Broad category of the exercise (e.g., Tactical, Technical).
 *         level:
 *           type: string
 *           description: Target skill level (e.g., Beginner, Advanced).
 *         theme:
 *           type: string
 *           description: Specific theme of the exercise (e.g., Finishing, Passing).
 *         video_url:
 *           type: string
 *           description: Optional link to a demonstration video.
 *         thumbnail_url:
 *           type: string
 *           description: Optional link to an image representing the exercise.
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created this exercise.
 *     Auth0TokenResponse:
 *       type: object
 *       description: Response containing the Auth0 Management API access token.
 *       properties:
 *         access_token:
 *           type: string
 *           description: The JWT access token to be used in subsequent Management API calls.
 *         token_type:
 *           type: string
 *           description: The type of token (typically "Bearer").
 *         expires_in:
 *           type: integer
 *           description: Remaining lifetime of the token in seconds.
 *         from_cache:
 *           type: boolean
 *           description: Indicates if the token was retrieved from the KV cache.
 */

/**
 * Main function to configure all application routes.
 * It takes a router instance and the environment configuration.
 */
export const setupRoutes = (router: Router, env: Env) => {
	/**
	 * @openapi
	 * /api/__auth0/token:
	 *   post:
	 *     tags:
	 *       - Auth0 Administration
	 *     summary: Obtain an Auth0 Management API token
	 *     description: >
	 *       Requests an Auth0 Management API token via the client_credentials flow.
	 *       This token is used by the backend to perform administrative tasks (like assigning permissions).
	 *       The token is cached in Cloudflare KV to respect Auth0 rate limits and improve performance.
	 *       Access is restricted to users with the 'auth0:admin:api' permission.
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved the Management API token.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               $ref: '#/components/schemas/Auth0TokenResponse'
	 *       401:
	 *         description: Unauthorized - The provided JWT is invalid or lacks the required administrative scope.
	 *       500:
	 *         description: Internal Server Error - An error occurred while communicating with Auth0 or the KV store.
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
	 * @openapi
	 * /api/__auth0/autopermissions:
	 *   post:
	 *     tags:
	 *       - Auth0 Administration
	 *     summary: Automatically assign default permissions to the current user
	 *     description: >
	 *       Checks the current user's permissions against a predefined list (AUTH0_AUTOMATIC_PERMISSIONS).
	 *       If any permissions are missing, they are automatically granted via the Auth0 Management API.
	 *       This is typically called by the client application after a successful login to ensure the user has a baseline set of capabilities.
	 *       Requires a valid JWT.
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Successfully processed. Returns details about added permissions or a message if none were needed.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success: { type: boolean }
	 *                 added: { type: array, items: { type: string }, description: "List of permissions newly granted." }
	 *                 message: { type: string, description: "Informational message if no permissions were added." }
	 *       500:
	 *         description: Internal Server Error - Failed to grant permissions due to an API or configuration error.
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

	/**
	 * @openapi
	 * /api/ws:
	 *   get:
	 *     tags:
	 *       - RealTime
	 *     summary: WebSocket Connection Hub
	 *     description: Upgrade to a WebSocket connection. Managed by the WEBSOCKET_HUB Durable Object.
	 */
	router.get("/api/ws", async (request: any): Promise<any> => {
		const id = env.WEBSOCKET_HUB.idFromName("global-hub");
		const hub = env.WEBSOCKET_HUB.get(id) as any;
		return hub.fetch(request as any) as any;
	});

	// Sub-section of routes for different domains (users, clubs, etc.)
	setupUserRoutes(router, env);
	setupClubRoutes(router, env);
	setupExerciseRoutes(router, env);
	setupSessionRoutes(router, env);
	setupMatchRoutes(router, env);
	setupAdminRoutes(router, env);
	// Preserve the original root response for backwards compatibility
	router.get("/", async () => {
		return new Response("KduFoot API is running", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	});

	/**
	 * @openapi
	 * /openapi.json:
	 *   get:
	 *     tags:
	 *       - System
	 *     summary: Retrieve the OpenAPI Specification
	 *     description: >
	 *       Provides the full OpenAPI 3.0.0 specification for this API in JSON format.
	 *       Note: This route currently serves a placeholder description, as the actual file is typically served from the frontend's public directory.
	 *     responses:
	 *       200:
	 *         description: The OpenAPI specification document.
	 */
	router.get("/openapi.json", async () => {
		return new Response("OpenAPI spec is generated by the client build and available at /openapi.json on the frontend.", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	});

	/**
	 * @openapi
	 * /health:
	 *   get:
	 *     tags:
	 *       - System
	 *     summary: API Health Check
	 *     description: Returns the status of the API to verify it is running and accessible.
	 *     responses:
	 *       200:
	 *         description: API is healthy and operational.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success: { type: boolean }
	 *                 status: { type: string, example: "ok" }
	 */
	router.get("/health", async () => {
		return new Response(JSON.stringify({ success: true, status: "ok" }), {
			status: 200,
			headers: { ...router.corsHeaders, "Content-Type": "application/json" },
		});
	});

	/**
	 * @openapi
	 * /api/debug-db:
	 *   get:
	 *     tags:
	 *       - System
	 *     summary: Database Connectivity Debugging
	 *     description: >
	 *       Verifies the connection to the Cloudflare D1 database by performing a simple count query on the users table.
	 *       Returns the database status and environment details.
	 *       Warning: This endpoint should be restricted or disabled in production.
	 *     responses:
	 *       200:
	 *         description: Database connection is successful.
	 *       500:
	 *         description: Database connection failed or query error.
	 */
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

	/**
	 * @openapi
	 * /api/ping:
	 *   get:
	 *     tags:
	 *       - Development
	 *     summary: Connectivity and Authentication Ping
	 *     description: A simple authenticated endpoint to verify that the user's JWT is valid and permissions are working.
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Successfully reached. Returns the user's sub claim from the JWT.
	 */
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

	/**
	 * @openapi
	 * /api/test-push:
	 *   get:
	 *     tags:
	 *       - Development
	 *     summary: Test Push Notification
	 *     description: Sends a dummy push notification to the current user to verify connectivity and VAPID setup.
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Push attempt initiated.
	 */
	router.get(
		"/api/test-push",
		async (request) => {
			const sub = router.jwtPayload.sub;
			if (!sub) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: router.corsHeaders });

			const user = await env.DB.prepare('SELECT push_subscription FROM users WHERE auth0_sub = ?').bind(sub).first<{ push_subscription: string | null }>();
			if (!user?.push_subscription) {
				return Response.json({ success: false, error: 'No push subscription found for this user' }, { status: 400, headers: router.corsHeaders });
			}

			const subscription = JSON.parse(user.push_subscription);
			const { broadcastNotification } = await import("../utils/broadcast");
			
			await broadcastNotification(env, {
				type: 'NOTIFICATION',
				notificationType: 'ENROLLMENT_ACCEPTED', // Use an existing type to trigger push
				message: 'Test de notification Push KduFoot ! ' + new Date().toLocaleTimeString(),
				targetUserId: sub,
				data: { test: true }
			});

			return Response.json({ success: true, message: 'Push test triggered' }, { headers: router.corsHeaders });
		},
		env.READ_PERMISSION,
	);

	/**
	 * @openapi
	 * /api/get_users:
	 *   get:
	 *     tags:
	 *       - Development
	 *     summary: Legacy Current User Identification
	 *     description: Returns the Auth0 'sub' claim for the currently authenticated user.
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved user mapping identification.
	 */
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

	/**
	 * @openapi
	 * /api/get/{user}:
	 *   get:
	 *     tags:
	 *       - Development
	 *     summary: Parameterized Identity Test
	 *     description: >
	 *       A test endpoint that accepts a user identifier in the path and returns it along with the current token and permissions.
	 *       Used for verifying path parameter parsing and JWT context availability.
	 *     parameters:
	 *       - name: user
	 *         in: path
	 *         required: true
	 *         description: Identifiant de l'utilisateur à tester.
	 *         schema:
	 *           type: string
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Echo of provided parameters and authenticating token details.
	 */
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
