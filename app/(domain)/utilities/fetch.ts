import { CURRENT_URL, INTERNAL_FETCH_SETTINGS, DEBUG_INTERNAL_API as LOG, DEBUG_FETCH } from "../app/config";

export async function fetchResource<T>(loc: string, param: any): Promise<T | undefined> {
    try {
        const url = loc + '?' + new URLSearchParams(param);
        if (DEBUG_FETCH) console.log('[INTERNAL-API] Fetching resource at ', url);

        const res = await fetch(url, INTERNAL_FETCH_SETTINGS);
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

export async function fetchText(loc: string, param: any): Promise<string | undefined> {
    try {
        const url = loc + '?' + new URLSearchParams(param);
        if (LOG) console.log('[INTERNAL-API] Fetching text at ', url);

        const res = await fetch(url, INTERNAL_FETCH_SETTINGS);
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
    const obj = await fetchResource<{ response: T }>(CURRENT_URL + route, { q: JSON.stringify(param) });
    return obj?.response;
}

export function parseParameter<T>(request: Request): T | undefined {
    try {
        const { searchParams } = new URL(request.url)
        if (LOG) console.log('[INTERNAL-API] Received parameter as', searchParams);

        const obj = JSON.parse(searchParams.get('q') ?? '') as T;
        if (LOG) console.log('[INTERNAL-API] Parsed parameter', obj);

        return obj;
    } catch (error) {
        console.error('[INTERNAL-API] Error parsing parameter', error);
        return undefined;
    }
}