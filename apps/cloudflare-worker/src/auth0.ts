/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
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
import * as jose from "jose";
import type { Env } from "./types/env";
import { Sentry } from "./utils/sentry";
import { fetchWithTimeout } from "./utils/fetch-utils";

/**
 * Auth0 Management API Token response
 */
export interface Auth0ManagementTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

/**
 * Verify a JWT token against the Auth0 JWKS
 * @param token a JWT token
 * @param env the environment variables
 * @returns a promise that resolves to the payload of the JWT token
 */
export const verifyToken = async (
	token: string,
	env: Env,
): Promise<jose.JWTPayload> => {
	let jwksUrl = "";

	// If provider is Auth0 we use the AUTH0_DOMAIN for creating the JWKS URL
	if (env.AUTHENTICATION_PROVIDER_TYPE === "auth0") {
		jwksUrl = `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`;
	} else if (env.AUTHENTICATION_PROVIDER_TYPE === "dex") {
		// If provider is Dex we use the DEX_JWKS_ENDPOINT for creating the JWKS URL
		jwksUrl = (env as any).DEX_JWKS_ENDPOINT;
	} else {
		throw new Error(
			`Unsupported authentication provider: ${env.AUTHENTICATION_PROVIDER_TYPE}`,
		);
	}
	const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

	const { payload } = await jose.jwtVerify(token, JWKS, {
		issuer: `https://${env.AUTH0_DOMAIN}/`,
		audience: env.AUTH0_AUDIENCE,
		algorithms: ["RS256"],
	});

	return payload;
};

/**
 * Check if a token has a given permission
 * @param token a JWT token
 * @param permission a permission or an array of permissions
 * @param env the environment variables
 * @returns a promise that resolves to an object with a boolean access field and the payload of the JWT token
 */
export const checkPermissions = async (
	token: string,
	permission: string | string[],
	env: Env,
): Promise<{
	access: boolean;
	payload: jose.JWTPayload;
	permissions: string[];
}> => {
	const payload = await verifyToken(token, env);
	let access = false;
	let permissions: string[] = [];

	if (payload.permissions && Array.isArray(payload.permissions)) {
		permissions = payload.permissions as string[];
	}

	if (permission === "") {
		access = true; // Authenticated user, no specific permission required
	} else if (typeof permission === "string") {
		access = permissions.includes(permission);
	} else {
		access = permission.some((p) => permissions.includes(p));
	}

	// Security: Force MFA for sensitive roles AND sensitive requested permissions
	const isSensitiveRole = permissions.some(p => p.includes("admin") || p.includes("certified"));
	// We only strictly enforce MFA if the permission being requested is itself sensitive (admin/write)
	const isSensitiveRequest = typeof permission === 'string' 
		? (permission.includes("admin") || permission.includes("write"))
		: permission.some(p => p.includes("admin") || p.includes("write"));

	if (isSensitiveRole && isSensitiveRequest && access) {
		// Auth0 standard claim for AMR is often an array
		const amr = (payload.amr as string[]) || [];
		const isMfa = amr.includes("mfa") || payload.mfa_authenticated === true || payload.amr === "mfa";
		
		// If MFA is missing on a sensitive request, we log a warning but don't block yet (Hotfix mode)
		if (!isMfa && env.AUTHENTICATION_PROVIDER_TYPE === "auth0") {
			console.warn(`[MFA WARNING] Sensitive role access without MFA: ${payload.sub} for ${permission}`);
			
			// Sentry reporting for visibility without blocking
			if (!env.API_BASE_URL?.includes("localhost")) {
				const error = new Error(`Sensitive role access without MFA: ${payload.sub}`);
				Sentry.captureException(error, { user: { id: payload.sub }, extra: { permission, is_soft_blocked: false } });
			}
			
			// access = false; // [DISABLED] Temporarily allowed for production maintenance
		}
	}

	return { access, payload, permissions };
};

/**
 * Retrieves a valid Auth0 Management API access token.
 * 
 * To optimize performance and respect Auth0 rate limits, this function:
 * 1. Checks Cloudflare KV (KV_CACHE) for an existing unexpired token.
 * 2. If no valid token is found, requests a new one from Auth0 using client_credentials.
 * 3. Caches the new token in KV with the same expiration time provided by Auth0.
 *
 * @param env - The Cloudflare Worker environment bindings.
 * @returns A promise resolving to the access token string.
 */
export const getManagementToken = async (env: Env): Promise<string> => {
	// Configuration Check: Ensure all required credentials are present in the environment
	if (
		!env.AUTH0_MANAGEMENT_API_CLIENT_ID ||
		!env.AUTH0_MANAGEMENT_API_CLIENT_SECRET ||
		!env.AUTH0_DOMAIN
	) {
		const missings = [];
		if (!env.AUTH0_MANAGEMENT_API_CLIENT_ID) missings.push("AUTH0_MANAGEMENT_API_CLIENT_ID");
		if (!env.AUTH0_MANAGEMENT_API_CLIENT_SECRET) missings.push("AUTH0_MANAGEMENT_API_CLIENT_SECRET");
		if (!env.AUTH0_DOMAIN) missings.push("AUTH0_DOMAIN");
		throw new Error(`Missing Auth0 Management API configuration: ${missings.join(", ")}`);
	}

	const cacheKey = `auth0:management_token`;

	// Step 1: Check KV cache for an existing token
	if (env.KV_CACHE) {
		const cached = await env.KV_CACHE.get(cacheKey);
		if (cached) {
			try {
				const parsed = JSON.parse(cached) as { token: string; exp: number };
				const now = Math.floor(Date.now() / 1000);
				// We return the cached token only if it has at least 10 seconds of TTL remaining
				if (parsed.exp > now + 10) {
					return parsed.token;
				}
			} catch (_) {
				// Fallback if the cached value is not valid JSON (legacy support or corruption)
			}
		}
	}

	// Step 2: Request a new M2M token from Auth0
	const tokenUrl = `https://${env.AUTH0_DOMAIN}/oauth/token`;
	const audience = `https://${env.AUTH0_DOMAIN}/api/v2/`;

	const resp = await fetchWithTimeout(tokenUrl, {
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
		const error = new Error(`Auth0 token request failed: ${errorText}`);
		Sentry.captureException(error, { extra: { status: resp.status, url: tokenUrl } });
		throw error;
	}

	const data = (await resp.json()) as Auth0ManagementTokenResponse;

	if (env.KV_CACHE && data.access_token) {
		const now = Math.floor(Date.now() / 1000);
		const exp = now + data.expires_in;
		await env.KV_CACHE.put(
			cacheKey,
			JSON.stringify({ token: data.access_token, exp }),
			{ expiration: exp },
		);
	}

	return data.access_token;
};

/**
 * Add permissions to an Auth0 user
 * @param userId the Auth0 user ID
 * @param permissions array of permission names
 * @param env the environment variables
 */
export const addPermissionsToUser = async (
	userId: string,
	permissions: string[],
	env: Env,
): Promise<void> => {
	const mgmtToken = await getManagementToken(env);
	const encodedId = encodeURIComponent(userId);
	const url = `https://${env.AUTH0_DOMAIN}/api/v2/users/${encodedId}/permissions`;

	const resp = await fetchWithTimeout(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${mgmtToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			permissions: permissions.map((p) => ({
				resource_server_identifier: env.AUTH0_AUDIENCE,
				permission_name: p,
			})),
		}),
	});

	if (!resp.ok) {
		throw new Error(`Failed to add permissions: ${await resp.text()}`);
	}
};
