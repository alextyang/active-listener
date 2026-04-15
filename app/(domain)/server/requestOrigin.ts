import { getAppOrigin } from "./env";

export const APP_ORIGIN_HEADER = "x-active-listener-origin";

export function isTrustedAppRequest(request: Request): boolean {
    const sourceOrigin = getSourceOrigin(request);
    if (!sourceOrigin)
        return false;

    return getAllowedOrigins(request).has(sourceOrigin);
}

function getAllowedOrigins(request: Request): Set<string> {
    const allowed = new Set<string>();
    allowed.add(new URL(request.url).origin);

    try {
        allowed.add(new URL(getAppOrigin()).origin);
    } catch {
        // Ignore invalid configured origins and fall back to the request origin.
    }

    return allowed;
}

function getSourceOrigin(request: Request): string | undefined {
    const value = request.headers.get("origin") ?? request.headers.get("referer") ?? request.headers.get(APP_ORIGIN_HEADER);
    if (!value)
        return undefined;

    try {
        return new URL(value).origin;
    } catch {
        return undefined;
    }
}
