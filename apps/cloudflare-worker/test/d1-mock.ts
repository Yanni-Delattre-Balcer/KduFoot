/**
 * D1Database Mock Utility
 * Simplified object-based mock to avoid 'this' context issues in tests.
 */
export const createMockD1 = (initialData: any[] = []) => {
    const mock = {
        prepare: (query: string) => ({
            bind: (...args: any[]) => mock.prepare(query),
            first: async () => initialData[0] || null,
            all: async () => ({
                success: true,
                results: initialData,
                meta: { duration: 1 }
            }),
            run: async () => {
                if (query.toUpperCase().includes('INSERT')) {
                    // Very simple mock: just push a generic object to simulate persistence
                    initialData.push({ id: 'm1', name: 'Match de Test', type: 'match', match_date: '2026-04-01' });
                }
                return {
                    success: true,
                    meta: { duration: 1, changes: 1 }
                };
            }
        }),
        batch: async (statements: any[]) => statements.map(() => ({
            success: true,
            results: initialData,
            meta: { duration: 1 }
        })),
        exec: async (query: string) => ({ count: 1, duration: 1 })
    };
    return mock as any;
};

export class D1DatabaseMock {
    // Keep for backward compatibility if needed, but createMockD1 is preferred
    constructor(data: any[] = []) {
        return createMockD1(data);
    }
}
