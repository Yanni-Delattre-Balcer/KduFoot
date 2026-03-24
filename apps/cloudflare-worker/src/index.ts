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

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		validateEnv(env);
		const url = new URL(request.url);
		const start = Date.now();
		let reqCount = 0;

		const envWithDb = env as import("./types/env").Env;
		if (envWithDb.DB) {
			const originalPrepare = envWithDb.DB.prepare.bind(envWithDb.DB);
			const originalBatch = envWithDb.DB.batch.bind(envWithDb.DB);
			envWithDb.DB.prepare = (query: string) => {
				reqCount++;
				return originalPrepare(query);
			};
			envWithDb.DB.batch = <T = unknown>(statements: D1PreparedStatement[]) => {
				reqCount += 1;
				return originalBatch(statements);
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
} satisfies ExportedHandler<Env>;
