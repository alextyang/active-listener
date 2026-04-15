import { beforeEach, describe, expect, it, vi } from "vitest";

const getTrackView = vi.fn();
const toTrackApiView = vi.fn();

vi.mock("@/app/(domain)/server/trackService", () => ({
    getTrackView,
}));

vi.mock("@/app/(domain)/server/trackApi", () => ({
    toTrackApiView,
}));

function routeContext(trackId: string) {
    return { params: Promise.resolve({ trackId }) };
}

describe("GET /api/tracks/[trackId]", () => {
    beforeEach(() => {
        getTrackView.mockReset();
        toTrackApiView.mockReset();
    });

    it("rejects invalid track ids", async () => {
        const { GET } = await import("./route");
        const response = await GET(new Request("http://localhost/api/tracks/bad-id"), routeContext("bad-id"));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_track_id" });
    });

    it("returns a trimmed dto and request headers", async () => {
        getTrackView.mockResolvedValue({ trackId: "track1" });
        toTrackApiView.mockReturnValue({ trackId: "track1", metadata: undefined, articles: [], status: { metadata: { status: "idle" }, articles: { status: "idle" }, summary: { status: "idle" } }, needsRefresh: { metadata: false, articles: false, summary: false } });

        const { GET } = await import("./route");
        const response = await GET(new Request("http://localhost/api/tracks/track1"), routeContext("track1"));

        expect(response.status).toBe(200);
        expect(response.headers.get("x-request-id")).toBeTruthy();
        expect(response.headers.get("x-app-origin")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({ trackId: "track1" });
        expect(getTrackView).toHaveBeenCalledWith("track1");
        expect(toTrackApiView).toHaveBeenCalled();
    });

    it("returns a 500 payload and headers when the track view load fails", async () => {
        getTrackView.mockRejectedValue(new Error("repository down"));

        const { GET } = await import("./route");
        const response = await GET(new Request("http://localhost/api/tracks/track1"), routeContext("track1"));

        expect(response.status).toBe(500);
        expect(response.headers.get("x-request-id")).toBeTruthy();
        expect(response.headers.get("x-app-origin")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({ error: "track_view_failed" });
        expect(toTrackApiView).not.toHaveBeenCalled();
    });
});
