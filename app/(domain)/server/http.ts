type QueryValue = string | number | boolean | undefined | null;

export async function fetchJson<T>(loc: string, param: Record<string, QueryValue>, init?: RequestInit & { timeoutMs?: number }): Promise<T | undefined> {
    const res = await fetchWithTimeout(loc, param, init);
    if (!res) return undefined;

    try {
        return await res.json() as T;
    } catch (error) {
        console.error("[HTTP] Failed to parse JSON response:", error);
        return undefined;
    }
}

export async function fetchText(loc: string, param: Record<string, QueryValue>, init?: RequestInit & { timeoutMs?: number }): Promise<string | undefined> {
    const res = await fetchWithTimeout(loc, param, init);
    if (!res) return undefined;

    try {
        return await res.text();
    } catch (error) {
        console.error("[HTTP] Failed to parse text response:", error);
        return undefined;
    }
}

async function fetchWithTimeout(loc: string, param: Record<string, QueryValue>, init?: RequestInit & { timeoutMs?: number }) {
    const controller = new AbortController();
    const timeoutMs = init?.timeoutMs ?? 10_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const query = new URLSearchParams(
            Object.entries(param)
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([key, value]) => [key, String(value)]),
        );
        const url = query.size > 0 ? `${loc}?${query.toString()}` : loc;

        return await fetch(url, {
            ...init,
            cache: init?.cache ?? "no-store",
            signal: controller.signal,
        });
    } catch (error) {
        console.error("[HTTP] Request failed:", error);
        return undefined;
    } finally {
        clearTimeout(timeout);
    }
}

