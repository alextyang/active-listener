import { CURRENT_URL, INTERNAL_FETCH_SETTINGS, DEBUG_INTERNAL_API as LOG, DEBUG_FETCH, FAVICON_API_ROUTE, FAVICON_API_QUERY } from "../app/config";

export async function fetchResource<T>(loc: string, param: any, body?: any): Promise<T | undefined> {
    try {
        const url = loc + '?' + new URLSearchParams(param);
        if (DEBUG_FETCH) console.log('[INTERNAL-API] Fetching resource at ', url);

        const res = await fetch(url, {
            method: body ? 'POST' : undefined,
            body: body ? JSON.stringify(body) : undefined,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            ...INTERNAL_FETCH_SETTINGS
        });
        if (DEBUG_FETCH) console.log('[INTERNAL-API] Got response', res);

        const json = await res.json();
        if (DEBUG_FETCH) console.log('[INTERNAL-API] Parsed JSON', json);

        const obj = json as T;
        if (DEBUG_FETCH) console.log('[INTERNAL-API] Parsed object', obj);

        return obj;
    } catch (error) {
        console.error('[INTERNAL-API] Error fetching resource', error);
        return undefined;
    }
}

export async function fetchText(loc: string, param: any, body?: any): Promise<string | undefined> {
    try {
        const url = loc + '?' + new URLSearchParams(param);
        if (LOG) console.log('[INTERNAL-API] Fetching text at ', url);

        const res = await fetch(url, {
            method: body ? 'POST' : undefined,
            body: body ? JSON.stringify(body) : undefined,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            ...INTERNAL_FETCH_SETTINGS
        });
        if (LOG) console.log('[INTERNAL-API] Got response', res.status);

        const txt = await res.text();
        if (LOG) console.log('[INTERNAL-API] Parsed text', txt.length);

        return txt;
    } catch (error) {
        console.error('[INTERNAL-API] Error fetching text', error);
        return undefined;
    }
}

export async function fetchInternalResource<T>(route: string, param: any): Promise<T | undefined> {
    const obj = await fetchResource<{ response: T }>(CURRENT_URL + route, {}, { q: JSON.stringify(param) });
    return obj?.response;
}


export async function parseParameter<T>(request: Request): Promise<T | undefined> {
    try {
        const params = await request.json()
        if (LOG) console.log('[INTERNAL-API] Received parameter as', params);

        const obj = JSON.parse(params['q'] ?? '') as T;
        if (LOG) console.log('[INTERNAL-API] Parsed parameter', obj);

        return obj;
    } catch (error) {
        console.error('[INTERNAL-API] Error parsing parameter', error);
        return undefined;
    }
}


export const wait = (m: number) => new Promise(r => setTimeout(r, m))
export const resolveSlowly = async (delay: number, promises: (Promise<any> | undefined)[]) => {
    const results = [];
    for (const promise of promises) {
        results.push(await promise);
        await wait(delay);
    }
    return results;
};

export function getFaviconUrl(url?: string): string {
    if (!url) return '';
    return FAVICON_API_ROUTE + url.split('/')[2] + FAVICON_API_QUERY;
}