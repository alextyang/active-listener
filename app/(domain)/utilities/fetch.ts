import { FAVICON_API_QUERY, FAVICON_API_ROUTE } from "../app/config";

export const wait = (m: number) => new Promise((resolve) => setTimeout(resolve, m));

export function getFaviconUrl(url?: string): string {
    if (!url) return '';
    return FAVICON_API_ROUTE + url.split('/')[2] + FAVICON_API_QUERY;
}
