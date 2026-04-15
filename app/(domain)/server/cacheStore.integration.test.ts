import { Redis } from "@upstash/redis";
import { afterEach, describe, expect, it } from "vitest";
import { createUpstashCacheStore } from "./cacheStore";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const testPrefix = `active-listener:vitest:${Date.now()}`;

describe.runIf(Boolean(redisUrl && redisToken))("createUpstashCacheStore", () => {
    const redis = new Redis({
        url: redisUrl!,
        token: redisToken!,
    });
    const cache = createUpstashCacheStore(redis);
    const touchedKeys = new Set<string>();

    afterEach(async () => {
        if (touchedKeys.size === 0)
            return;

        await redis.del(...Array.from(touchedKeys));
        touchedKeys.clear();
    });

    it("round-trips cached values and expires them by ttl", async () => {
        const key = `${testPrefix}:ttl`;
        touchedKeys.add(key);

        await cache.set(key, { ok: true }, 1);
        await expect(cache.get<{ ok: boolean }>(key)).resolves.toEqual({ ok: true });

        await delay(1100);
        await expect(cache.get(key)).resolves.toBeUndefined();
    });

    it("acquires, blocks, and releases distributed locks", async () => {
        const key = `${testPrefix}:lock`;
        touchedKeys.add(key);

        await expect(cache.acquireLock(key, 5)).resolves.toBe(true);
        await expect(cache.acquireLock(key, 5)).resolves.toBe(false);

        await cache.releaseLock(key);
        await expect(cache.acquireLock(key, 5)).resolves.toBe(true);
    });
});

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
