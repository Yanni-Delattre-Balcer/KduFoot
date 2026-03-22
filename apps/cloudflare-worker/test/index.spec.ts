/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { mockEnv } from './setup';

const IncomingRequest = Request as any;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
		const response = await worker.fetch(request, mockEnv as any, ctx as any);

		expect(await response.text()).toContain("KduFoot API is running");
	});

	it('responds with 401 on /api/me/export without token', async () => {
		const request = new IncomingRequest('http://example.com/api/me/export');
		const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
		const response = await worker.fetch(request, mockEnv as any, ctx as any);
		expect(response.status).toBe(401);
	});
});
