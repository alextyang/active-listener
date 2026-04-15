import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe("app origin helpers", () => {
    it("prefers APP_ORIGIN and preserves trailing slash behavior for redirect URIs", async () => {
        vi.stubEnv("APP_ORIGIN", "https://example.com/");
        const { getAppOrigin, getSpotifyRedirectUri } = await import("./env");

        expect(getAppOrigin()).toBe("https://example.com");
        expect(getSpotifyRedirectUri("/")).toBe("https://example.com/");
        expect(getSpotifyRedirectUri("/callback")).toBe("https://example.com/callback");
    });

    it("falls back to localhost when no origin is configured", async () => {
        vi.stubEnv("APP_ORIGIN", "");
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        vi.stubEnv("VERCEL_URL", "");
        const { getAppOrigin } = await import("./env");
        expect(getAppOrigin()).toContain("127.0.0.1");
    });
});
