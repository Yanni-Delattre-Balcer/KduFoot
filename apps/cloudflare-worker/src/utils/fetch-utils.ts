/**
 * FAANG-Standard Fetch with Timeout using AbortController
 * Prevents Worker "GB-seconds" leakage and Domino Effect.
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 3000 // default 3s Fail-Fast
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Timeout: External service ${url} failed to respond within ${timeoutMs}ms`);
        }
        throw error;
    }
}
