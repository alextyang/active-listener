import { getCacheStore } from "./cacheStore";

const TRACK_REFRESH_RATE_LIMIT_PREFIX = "track:refresh:rl:";
const TRACK_REFRESH_RATE_LIMIT_WINDOW_SECONDS = 60;
const TRACK_REFRESH_RATE_LIMIT_MAX = 12;

export type TrackRefreshQuota = {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
};

export async function consumeTrackRefreshQuota(trackId: string, clientId: string): Promise<TrackRefreshQuota> {
    const cache = getCacheStore();
    const key = `${TRACK_REFRESH_RATE_LIMIT_PREFIX}${clientId}:${trackId}`;
    const current = await cache.get<{ count: number; windowStart: string }>(key);
    const now = Date.now();

    if (!current || now - new Date(current.windowStart).getTime() >= TRACK_REFRESH_RATE_LIMIT_WINDOW_SECONDS * 1000) {
        await cache.set(key, {
            count: 1,
            windowStart: new Date(now).toISOString(),
        }, TRACK_REFRESH_RATE_LIMIT_WINDOW_SECONDS);

        return {
            allowed: true,
            remaining: TRACK_REFRESH_RATE_LIMIT_MAX - 1,
            retryAfterSeconds: 0,
        };
    }

    if (current.count >= TRACK_REFRESH_RATE_LIMIT_MAX) {
        const windowEnd = new Date(new Date(current.windowStart).getTime() + TRACK_REFRESH_RATE_LIMIT_WINDOW_SECONDS * 1000).getTime();
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
        };
    }

    await cache.set(key, {
        count: current.count + 1,
        windowStart: current.windowStart,
    }, Math.max(1, Math.ceil((TRACK_REFRESH_RATE_LIMIT_WINDOW_SECONDS * 1000 - (now - new Date(current.windowStart).getTime())) / 1000)));

    return {
        allowed: true,
        remaining: TRACK_REFRESH_RATE_LIMIT_MAX - (current.count + 1),
        retryAfterSeconds: 0,
    };
}

export function getRefreshClientId(trackId: string, clientIp: string) {
    return `${clientIp}:${trackId}`;
}
