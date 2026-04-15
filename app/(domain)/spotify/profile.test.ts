import { describe, expect, it, vi } from "vitest";
import type { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { getMarket, getUserProfile } from "./profile";

describe("getUserProfile", () => {
    it("returns the sdk profile when the primary request succeeds", async () => {
        const profile = { id: "spotify-user", country: "US" } as UserProfile;
        const client = {
            currentUser: {
                profile: vi.fn(async () => profile),
            },
        } as unknown as SpotifyApi;

        const result = await getUserProfile(client, {
            fetch: vi.fn(),
            loadStoredAccessToken: () => undefined,
        });

        expect(result).toBe(profile);
    });

    it("falls back to a direct spotify profile fetch when the sdk request rejects", async () => {
        const profile = { id: "spotify-user", country: "US" } as UserProfile;
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => profile,
        })) as unknown as typeof fetch;
        const client = {
            currentUser: {
                profile: vi.fn(async () => {
                    throw new Error("sdk failed");
                }),
            },
        } as unknown as SpotifyApi;

        const result = await getUserProfile(client, {
            fetch: fetchMock,
            loadStoredAccessToken: () => "spotify-access-token",
        });

        expect(fetchMock).toHaveBeenCalledWith("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: "Bearer spotify-access-token",
            },
        });
        expect(result).toBe(profile);
    });

    it("rethrows the sdk error when no stored access token is available", async () => {
        const error = new Error("sdk failed");
        const client = {
            currentUser: {
                profile: vi.fn(async () => {
                    throw error;
                }),
            },
        } as unknown as SpotifyApi;

        await expect(getUserProfile(client, {
            fetch: vi.fn() as typeof fetch,
            loadStoredAccessToken: () => undefined,
        })).rejects.toBe(error);
    });
});

describe("getMarket", () => {
    it("returns the user's market when available", () => {
        expect(getMarket({ country: "GB" } as UserProfile)).toBe("GB");
    });

    it("falls back to the default market when the profile is missing", () => {
        expect(getMarket(undefined)).toBe("US");
    });
});
