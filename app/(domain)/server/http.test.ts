import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson, fetchText } from "./http";

describe("http helpers", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("serializes query params and returns parsed json", async () => {
        const fetchMock = vi.fn(async () => ({
            json: async () => ({ ok: true }),
        }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchJson("https://example.com/search", {
            q: "mr brightside",
            page: 2,
            draft: false,
            missing: undefined,
            empty: null,
        })).resolves.toEqual({ ok: true });

        expect(fetchMock).toHaveBeenCalledWith(
            "https://example.com/search?q=mr+brightside&page=2&draft=false",
            expect.objectContaining({ cache: "no-store" }),
        );
    });

    it("returns undefined when json parsing fails", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            json: async () => {
                throw new Error("bad json");
            },
        })));

        await expect(fetchJson("https://example.com/search", {})).resolves.toBeUndefined();
    });

    it("returns undefined when the request throws before a response is available", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new Error("network down");
        }));

        await expect(fetchText("https://example.com/search", {})).resolves.toBeUndefined();
    });

    it("aborts timed out text requests and returns undefined", async () => {
        const fetchMock = vi.fn((_: string, init?: RequestInit) => new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
            });
        }));
        vi.stubGlobal("fetch", fetchMock);

        const request = fetchText("https://example.com/article", {}, { timeoutMs: 50 });
        await vi.advanceTimersByTimeAsync(51);

        await expect(request).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});
