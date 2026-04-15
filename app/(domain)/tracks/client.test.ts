import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeSummaryStreamBuffer, fetchTrackView, refreshTrackStage, streamTrackSummary } from "./client";
import { APP_ORIGIN_HEADER } from "../server/requestOrigin";

describe("track client", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("loads a track view from the api", async () => {
        const response = {
            ok: true,
            json: async () => ({ trackId: "track1", articles: [], status: {}, needsRefresh: {} }),
        };
        const fetchMock = vi.fn(async () => response);
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchTrackView("track1")).resolves.toMatchObject({ trackId: "track1" });
        expect(fetchMock).toHaveBeenCalledWith("/api/tracks/track1", expect.objectContaining({
            method: "GET",
            cache: "no-store",
        }));
    });

    it("formats rate-limited refresh errors with retry timing", async () => {
        vi.stubGlobal("window", {
            location: {
                origin: "http://127.0.0.1:3001",
            },
        });
        const fetchMock = vi.fn(async () => ({
            ok: false,
            status: 429,
            json: async () => ({ error: "rate_limited", retryAfterSeconds: 7 }),
        }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(refreshTrackStage("track1", "summary")).rejects.toThrow("Failed to refresh summary stage (429). Retry after 7s.");
        expect(fetchMock).toHaveBeenCalledWith("/api/tracks/track1/refresh", expect.objectContaining({
            headers: expect.objectContaining({
                [APP_ORIGIN_HEADER]: "http://127.0.0.1:3001",
            }),
        }));
    });

    it("falls back to the generic refresh error when the response body is not json", async () => {
        const fetchMock = vi.fn(async () => ({
            ok: false,
            status: 503,
            json: async () => {
                throw new Error("not json");
            },
        }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(refreshTrackStage("track/needs encoding", "articles", true)).rejects.toThrow("Failed to refresh articles stage (503)");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/tracks/track%2Fneeds%20encoding/refresh",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ stage: "articles", force: true }),
            }),
        );
    });

    it("parses summary stream events while preserving incomplete trailing data", () => {
        const result = consumeSummaryStreamBuffer(
            `${JSON.stringify({ type: "delta", delta: "First " })}\n${JSON.stringify({ type: "complete", view: { trackId: "track1" } })}\n{"type":"delta"`,
        );

        expect(result.events).toEqual([
            { type: "delta", delta: "First " },
            { type: "complete", view: { trackId: "track1" } },
        ]);
        expect(result.rest).toBe('{"type":"delta"');
    });

    it("streams summary deltas and returns the final track view", async () => {
        vi.stubGlobal("window", {
            location: {
                origin: "http://127.0.0.1:3001",
            },
        });
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode(JSON.stringify({ type: "delta", delta: "First " }) + "\n"));
                controller.enqueue(encoder.encode(JSON.stringify({ type: "delta", delta: "second." }) + "\n"));
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: "complete",
                    view: {
                        trackId: "track1",
                        metadata: undefined,
                        articles: [],
                        summary: "First second.",
                        status: {},
                        needsRefresh: {},
                    },
                }) + "\n"));
                controller.close();
            },
        });
        const fetchMock = vi.fn(async () => ({
            ok: true,
            body,
        }));
        const onDelta = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(streamTrackSummary("track1", { onDelta })).resolves.toMatchObject({
            trackId: "track1",
            summary: "First second.",
        });
        expect(onDelta).toHaveBeenNthCalledWith(1, "First ");
        expect(onDelta).toHaveBeenNthCalledWith(2, "second.");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/tracks/track1/summary/stream",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    [APP_ORIGIN_HEADER]: "http://127.0.0.1:3001",
                }),
                body: JSON.stringify({ force: undefined }),
            }),
        );
    });
});
