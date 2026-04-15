import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

vi.mock("./cacheStore", () => ({
    getCacheStore: () => ({
        get: async <T>(key: string) => store.get(key) as T | undefined,
        set: async <T>(key: string, value: T) => {
            store.set(key, value);
        },
        del: async (key: string) => {
            store.delete(key);
        },
        acquireLock: async () => true,
        releaseLock: async () => undefined,
    }),
}));

describe("consumeTrackRefreshQuota", () => {
    beforeEach(() => {
        store.clear();
    });

    it("allows requests within the window and decrements remaining quota", async () => {
        const { consumeTrackRefreshQuota } = await import("./trackRefreshGuard");

        const first = await consumeTrackRefreshQuota("track-1", "127.0.0.1:track-1");
        const second = await consumeTrackRefreshQuota("track-1", "127.0.0.1:track-1");

        expect(first.allowed).toBe(true);
        expect(first.remaining).toBeGreaterThan(0);
        expect(second.allowed).toBe(true);
        expect(second.remaining).toBeLessThan(first.remaining);
    });

    it("blocks requests after the limit is exceeded", async () => {
        const { consumeTrackRefreshQuota } = await import("./trackRefreshGuard");

        for (let index = 0; index < 12; index++) {
            const result = await consumeTrackRefreshQuota("track-1", "127.0.0.1:track-1");
            expect(result.allowed).toBe(true);
        }

        const blocked = await consumeTrackRefreshQuota("track-1", "127.0.0.1:track-1");
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
});
