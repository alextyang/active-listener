import { describe, expect, it, vi } from "vitest";
import { getClientIp, getRequestOrigin, logTrackError, logTrackEvent } from "./observability";

describe("observability helpers", () => {
    it("extracts client ip and request origin from standard headers", () => {
        const request = new Request("http://localhost/api/tracks/track1", {
            headers: {
                "x-forwarded-for": "203.0.113.1, 10.0.0.1",
                origin: "https://example.com",
            },
        });

        expect(getClientIp(request)).toBe("203.0.113.1");
        expect(getRequestOrigin(request)).toBe("https://example.com");
    });

    it("serializes structured events and errors", () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        logTrackEvent({ event: "track.view.success", requestId: "req-1", trackId: "track-1" });
        logTrackError({ event: "track.view.error", requestId: "req-2", error: new Error("boom") });

        expect(infoSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();

        infoSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
