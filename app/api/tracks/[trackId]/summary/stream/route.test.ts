import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ORIGIN_HEADER } from "@/app/(domain)/server/requestOrigin";

const streamTrackSummaryStage = vi.fn();
const toTrackApiView = vi.fn();
const consumeTrackRefreshQuota = vi.fn();

vi.mock("@/app/(domain)/server/trackService", () => ({
    streamTrackSummaryStage,
}));

vi.mock("@/app/(domain)/server/trackApi", () => ({
    toTrackApiView,
}));

vi.mock("@/app/(domain)/server/trackRefreshGuard", () => ({
    consumeTrackRefreshQuota,
    getRefreshClientId: (trackId: string, clientIp: string) => `${clientIp}:${trackId}`,
}));

function routeContext(trackId: string) {
    return { params: Promise.resolve({ trackId }) };
}

describe("POST /api/tracks/[trackId]/summary/stream", () => {
    beforeEach(() => {
        streamTrackSummaryStage.mockReset();
        toTrackApiView.mockReset();
        consumeTrackRefreshQuota.mockReset();
    });

    it("rejects invalid json payloads", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { origin: "http://localhost" },
            body: "{",
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_json" });
    });

    it("rate limits repeated summary streams", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 9 });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ force: false }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(429);
        expect(response.headers.get("retry-after")).toBe("9");
        await expect(response.json()).resolves.toMatchObject({ error: "rate_limited", retryAfterSeconds: 9 });
        expect(streamTrackSummaryStage).not.toHaveBeenCalled();
    });

    it("streams deltas followed by the final dto", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
        streamTrackSummaryStage.mockImplementation(async (_trackId: string, _request: { force?: boolean }, onDelta: (delta: string) => void | Promise<void>) => {
            await onDelta("First ");
            await onDelta("second.");
            return { trackId: "track1" };
        });
        toTrackApiView.mockReturnValue({
            trackId: "track1",
            metadata: undefined,
            articles: [],
            summary: "First second.",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1", origin: "http://localhost" },
            body: JSON.stringify({ force: true }),
        });

        const response = await POST(request, routeContext("track1"));
        const body = await response.text();
        const lines = body.trim().split("\n").map((line) => JSON.parse(line));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/x-ndjson");
        expect(response.headers.get("x-rate-limit-remaining")).toBe("4");
        expect(lines).toEqual([
            { type: "delta", delta: "First " },
            { type: "delta", delta: "second." },
            expect.objectContaining({
                type: "complete",
                view: expect.objectContaining({ trackId: "track1", summary: "First second." }),
            }),
        ]);
        expect(streamTrackSummaryStage).toHaveBeenCalledWith("track1", { force: true }, expect.any(Function));
    });

    it("accepts same-origin summary stream requests through the explicit app-origin header", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
        streamTrackSummaryStage.mockResolvedValue({ trackId: "track1" });
        toTrackApiView.mockReturnValue({
            trackId: "track1",
            metadata: undefined,
            articles: [],
            summary: "Ready",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        });

        const { POST } = await import("./route");
        const request = new Request("http://127.0.0.1:3001/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [APP_ORIGIN_HEADER]: "http://127.0.0.1:3001",
            },
            body: JSON.stringify({ force: true }),
        });

        const response = await POST(request, routeContext("track1"));
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body.trim().split("\n").map((line) => JSON.parse(line))).toEqual([
            expect.objectContaining({
                type: "complete",
                view: expect.objectContaining({ trackId: "track1", summary: "Ready" }),
            }),
        ]);
        expect(streamTrackSummaryStage).toHaveBeenCalledWith("track1", { force: true }, expect.any(Function));
    });

    it("writes an error event when the streamed stage resolves as an error state", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 3, retryAfterSeconds: 0 });
        streamTrackSummaryStage.mockResolvedValue({ trackId: "track1" });
        toTrackApiView.mockReturnValue({
            trackId: "track1",
            metadata: undefined,
            articles: [],
            summary: undefined,
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "error" },
            },
            lastError: {
                stage: "summary",
                message: "provider down",
                at: "2026-04-13T00:00:00.000Z",
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: true,
            },
        });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({}),
        });

        const response = await POST(request, routeContext("track1"));
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body.trim()).toBe(JSON.stringify({ type: "error", error: "provider down" }));
    });

    it("does not crash when the client cancels the summary stream mid-flight", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
        streamTrackSummaryStage.mockImplementation(async (_trackId: string, _request: { force?: boolean }, onDelta: (delta: string) => void | Promise<void>) => {
            await onDelta("First ");
            await Promise.resolve();
            await onDelta("second.");
            return { trackId: "track1" };
        });
        toTrackApiView.mockReturnValue({
            trackId: "track1",
            metadata: undefined,
            articles: [],
            summary: "First second.",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ force: true }),
        });

        const response = await POST(request, routeContext("track1"));
        const reader = response.body?.getReader();

        expect(reader).toBeDefined();
        await reader?.read();
        await expect(reader?.cancel()).resolves.toBeUndefined();
        await expect(Promise.resolve()).resolves.toBeUndefined();
    });

    it("rejects cross-origin summary stream requests", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/summary/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "https://evil.example" },
            body: JSON.stringify({ force: true }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_origin" });
        expect(streamTrackSummaryStage).not.toHaveBeenCalled();
    });
});
