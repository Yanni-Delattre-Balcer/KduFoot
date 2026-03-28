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
import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router } from "./routes/router";
import { setupRoutes } from "./routes";
import { Env } from "./types/env";
import { Sentry, scrubPII } from "./utils/sentry";

export { WebSocketHub } from "./durable_objects/WebSocketHub";

/** Fail fast if critical env vars are missing — caught at first request, not at deploy. */
function validateEnv(env: Env): void {
    const required: (keyof Env)[] = ['AUTH0_DOMAIN', 'CORS_ORIGIN', 'AUTH0_AUDIENCE'];
    const missing = required.filter(key => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// NOTE: We now use a small Router class to organize routes and permission checks.

export default Sentry.withSentry(
	(env: Env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.1,
		environment: env.API_BASE_URL?.includes('localhost') ? 'development' : 'production',
		region: 'eu',
		beforeSend(event) {
			return scrubPII(event);
		},
	}),
	{
		async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
			validateEnv(env);

			// FAANG-Standard Maintenance Mode Interceptor (via KV)
			const maintenanceStatus = await env.KV_CACHE.get('maintenance:status');
			if (maintenanceStatus) {
				const method = request.method;
				const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
				
				if (maintenanceStatus === 'emergency') {
					return new Response(JSON.stringify({ 
						success: false, 
						error: 'Maintenance en cours', 
						message: 'Le système est temporairement hors ligne pour maintenance critique.' 
					}), { 
						status: 503, 
						headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' } 
					});
				}
				
				if (maintenanceStatus === 'readonly' && isWrite) {
					return new Response(JSON.stringify({ 
						success: false, 
						error: 'Mode Lecture Seule', 
						message: 'Les écritures sont temporairement désactivées pour maintenance.' 
					}), { 
						status: 503, 
						headers: { 'Content-Type': 'application/json' } 
					});
				}
			}

			const url = new URL(request.url);
			const start = Date.now();
			let reqCount = 0;

			const envWithDb = env as import("./types/env").Env;
			if (envWithDb.DB) {
				const originalPrepare = envWithDb.DB.prepare.bind(envWithDb.DB);
				const originalBatch = envWithDb.DB.batch.bind(envWithDb.DB);

				const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 10): Promise<T> => {
					try {
						return await fn();
					} catch (e: any) {
						if (retries > 0 && e.message?.includes('is locked')) {
							await new Promise(res => setTimeout(res, delay));
							return withRetry(fn, retries - 1, delay * 4);
						}
						throw e;
					}
				};

				envWithDb.DB.prepare = (query: string) => {
					const stmt = originalPrepare(query);
					const originalAll = stmt.all.bind(stmt);
					const originalRun = stmt.run.bind(stmt);
					const originalFirst = stmt.first.bind(stmt);

					stmt.all = <T = unknown>() => {
						reqCount++;
						return withRetry(() => originalAll());
					};
					stmt.run = () => {
						reqCount++;
						return withRetry(() => originalRun());
					};
					stmt.first = <T = unknown>(colName?: string) => {
						reqCount++;
						return withRetry(() => (colName ? originalFirst(colName as any) : originalFirst()));
					};
					return stmt;
				};

				envWithDb.DB.batch = (statements: any[]) => {
					reqCount += 1;
					return withRetry(() => originalBatch(statements));
				};
			}

			const router = new Router(envWithDb);
			setupRoutes(router, envWithDb, ctx);

			const response = await router.handleRequest(request, envWithDb, ctx);
			
			const duration = Date.now() - start;
			// eslint-disable-next-line no-console
			console.log(JSON.stringify({
				timestamp: new Date().toISOString(),
				method: request.method,
				url: request.url,
				status: response.status,
				durationMs: duration,
				d1RequestCount: reqCount,
				message: `Processed ${request.method} ${url.pathname} in ${duration}ms with ${reqCount} D1 queries.`
			}));
			
			return response;
		},
	}
) satisfies ExportedHandler<Env>;
