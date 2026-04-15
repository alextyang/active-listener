import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe("isTrustedAppRequest", () => {
    it("accepts the explicit app-origin header when it matches the request origin", async () => {
        const { APP_ORIGIN_HEADER, isTrustedAppRequest } = await import("./requestOrigin");
        const request = new Request("http://127.0.0.1:3001/api/tracks/track1/refresh", {
            method: "POST",
            headers: {
                [APP_ORIGIN_HEADER]: "http://127.0.0.1:3001",
            },
        });

        expect(isTrustedAppRequest(request)).toBe(true);
    });

    it("rejects a mismatched explicit app-origin header", async () => {
        const { APP_ORIGIN_HEADER, isTrustedAppRequest } = await import("./requestOrigin");
        const request = new Request("http://127.0.0.1:3001/api/tracks/track1/refresh", {
            method: "POST",
            headers: {
                [APP_ORIGIN_HEADER]: "https://evil.example",
            },
        });

        expect(isTrustedAppRequest(request)).toBe(false);
    });

    it("accepts the configured app origin when the custom header matches it", async () => {
        vi.stubEnv("APP_ORIGIN", "https://activelistener.alexya.ng");
        const { APP_ORIGIN_HEADER, isTrustedAppRequest } = await import("./requestOrigin");
        const request = new Request("https://deployment.example/api/tracks/track1/refresh", {
            method: "POST",
            headers: {
                [APP_ORIGIN_HEADER]: "https://activelistener.alexya.ng",
            },
        });

        expect(isTrustedAppRequest(request)).toBe(true);
    });
});
