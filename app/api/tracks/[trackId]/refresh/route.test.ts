import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ORIGIN_HEADER } from "@/app/(domain)/server/requestOrigin";

const refreshTrackStage = vi.fn();
const toTrackApiView = vi.fn();
const consumeTrackRefreshQuota = vi.fn();

vi.mock("@/app/(domain)/server/trackService", () => ({
    refreshTrackStage,
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

describe("POST /api/tracks/[trackId]/refresh", () => {
    beforeEach(() => {
        refreshTrackStage.mockReset();
        toTrackApiView.mockReset();
        consumeTrackRefreshQuota.mockReset();
    });

    it("rejects invalid json payloads", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { origin: "http://localhost" },
            body: "{",
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_json" });
    });

    it("rejects invalid track ids", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/not-valid!/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("not-valid!"));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_track_id" });
        expect(refreshTrackStage).not.toHaveBeenCalled();
    });

    it("rejects invalid payload shapes", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ stage: "invalid-stage" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_refresh_payload" });
        expect(refreshTrackStage).not.toHaveBeenCalled();
    });

    it("rate limits repeated refreshes", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 12 });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(429);
        expect(response.headers.get("retry-after")).toBe("12");
        await expect(response.json()).resolves.toMatchObject({ error: "rate_limited", retryAfterSeconds: 12 });
        expect(refreshTrackStage).not.toHaveBeenCalled();
    });

    it("returns a trimmed dto on success", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 11, retryAfterSeconds: 0 });
        refreshTrackStage.mockResolvedValue({ trackId: "track1" });
        toTrackApiView.mockReturnValue({ trackId: "track1", metadata: undefined, articles: [], status: { metadata: { status: "idle" }, articles: { status: "idle" }, summary: { status: "idle" } }, needsRefresh: { metadata: false, articles: false, summary: false } });

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1", origin: "http://localhost" },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(200);
        expect(response.headers.get("x-rate-limit-remaining")).toBe("11");
        await expect(response.json()).resolves.toMatchObject({ trackId: "track1" });
        expect(refreshTrackStage).toHaveBeenCalledWith("track1", { stage: "summary" });
        expect(toTrackApiView).toHaveBeenCalled();
    });

    it("accepts same-origin refresh requests through the explicit app-origin header", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 11, retryAfterSeconds: 0 });
        refreshTrackStage.mockResolvedValue({ trackId: "track1" });
        toTrackApiView.mockReturnValue({ trackId: "track1", metadata: undefined, articles: [], status: { metadata: { status: "idle" }, articles: { status: "idle" }, summary: { status: "idle" } }, needsRefresh: { metadata: false, articles: false, summary: false } });

        const { POST } = await import("./route");
        const request = new Request("http://127.0.0.1:3001/api/tracks/track1/refresh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-forwarded-for": "127.0.0.1",
                [APP_ORIGIN_HEADER]: "http://127.0.0.1:3001",
            },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ trackId: "track1" });
        expect(refreshTrackStage).toHaveBeenCalledWith("track1", { stage: "summary" });
    });

    it("returns a 500 payload when refresh throws", async () => {
        consumeTrackRefreshQuota.mockResolvedValue({ allowed: true, remaining: 10, retryAfterSeconds: 0 });
        refreshTrackStage.mockRejectedValue(new Error("provider down"));

        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "http://localhost" },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(500);
        expect(response.headers.get("x-request-id")).toBeTruthy();
        expect(response.headers.get("x-app-origin")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({ error: "track_refresh_failed" });
        expect(toTrackApiView).not.toHaveBeenCalled();
    });

    it("rejects cross-origin refresh requests", async () => {
        const { POST } = await import("./route");
        const request = new Request("http://localhost/api/tracks/track1/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json", origin: "https://evil.example" },
            body: JSON.stringify({ stage: "summary" }),
        });

        const response = await POST(request, routeContext("track1"));

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_origin" });
        expect(refreshTrackStage).not.toHaveBeenCalled();
    });
});
