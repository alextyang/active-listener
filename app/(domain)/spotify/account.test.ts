import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    delete (globalThis as { window?: Window }).window;
    delete (globalThis as { document?: Document }).document;
});

describe("resolveSpotifyRedirectUri", () => {
    it("prefers NEXT_PUBLIC_APP_URL when configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://activelistener.alexya.ng");
        const { resolveSpotifyRedirectUri } = await import("./account");

        expect(resolveSpotifyRedirectUri()).toBe("https://activelistener.alexya.ng/");
    });

    it("falls back to the browser origin when no public app url is configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        (globalThis as { window?: { location: { origin: string } } }).window = {
            location: {
                origin: "http://localhost:3000",
            },
        };

        const { resolveSpotifyRedirectUri } = await import("./account");
        expect(resolveSpotifyRedirectUri()).toBe("http://localhost:3000/");
    });
});

describe("shouldAutoLogin", () => {
    it("auto-logins when Spotify returns with an auth code callback", async () => {
        vi.stubGlobal("localStorage", {
            getItem: vi.fn(() => null),
        });
        (globalThis as { window?: { location: { search: string } } }).window = {
            location: {
                search: "?code=spotify-code&state=spotify-state",
            },
        };

        const { shouldAutoLogin } = await import("./account");
        expect(shouldAutoLogin(undefined)).toBe(true);
    });

    it("does not auto-login when a client already exists", async () => {
        vi.stubGlobal("localStorage", {
            getItem: vi.fn(() => null),
        });
        (globalThis as { window?: { location: { search: string } } }).window = {
            location: {
                search: "?code=spotify-code",
            },
        };

        const { shouldAutoLogin } = await import("./account");
        expect(shouldAutoLogin({} as never)).toBe(false);
    });
});

describe("clearSpotifyAuthCallbackParams", () => {
    it("removes Spotify callback params while preserving unrelated query params", async () => {
        const replaceState = vi.fn();
        const windowStub = {
            location: {
                href: "https://activelistener.alexya.ng/?code=spotify-code&state=spotify-state&error=access_denied&keep=1#player",
            },
            history: {
                replaceState,
            },
        };
        (globalThis as unknown as { window?: typeof windowStub }).window = windowStub;
        (globalThis as { document?: { title: string } }).document = {
            title: "Active Listener",
        };

        const { clearSpotifyAuthCallbackParams } = await import("./account");
        clearSpotifyAuthCallbackParams();

        expect(replaceState).toHaveBeenCalledWith({}, "Active Listener", "/?keep=1#player");
    });
});

describe("isMissingSpotifyVerifierError", () => {
    it("identifies missing-verifier auth failures", async () => {
        const { isMissingSpotifyVerifierError } = await import("./account");

        expect(isMissingSpotifyVerifierError(new Error("No verifier found in cache - can't validate query string callback parameters."))).toBe(true);
        expect(isMissingSpotifyVerifierError(new Error("Different auth failure"))).toBe(false);
        expect(isMissingSpotifyVerifierError("No verifier found in cache")).toBe(false);
    });
});
