import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryCacheStore } from "./cacheStore";

describe("createMemoryCacheStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-13T00:00:00.000Z"));
    });

    it("returns stored values before ttl expiry and clears them after expiry", async () => {
        const cache = createMemoryCacheStore();

        await cache.set("track:view:1", { trackId: "1" }, 1);
        expect(await cache.get<{ trackId: string }>("track:view:1")).toEqual({ trackId: "1" });

        vi.advanceTimersByTime(1001);
        expect(await cache.get("track:view:1")).toBeUndefined();
    });

    it("treats non-positive ttl values as no-ops", async () => {
        const cache = createMemoryCacheStore();

        await cache.set("track:view:1", { trackId: "1" }, 0);
        expect(await cache.get("track:view:1")).toBeUndefined();
    });

    it("locks and releases keys deterministically", async () => {
        const cache = createMemoryCacheStore();

        expect(await cache.acquireLock("track:lock:1", 1)).toBe(true);
        expect(await cache.acquireLock("track:lock:1", 1)).toBe(false);

        await cache.releaseLock("track:lock:1");
        expect(await cache.acquireLock("track:lock:1", 1)).toBe(true);
    });

    it("allows a lock to be acquired again after expiry", async () => {
        const cache = createMemoryCacheStore();

        expect(await cache.acquireLock("track:lock:1", 1)).toBe(true);
        vi.advanceTimersByTime(1001);
        expect(await cache.acquireLock("track:lock:1", 1)).toBe(true);
    });
});
