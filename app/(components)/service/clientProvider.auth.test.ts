import { describe, expect, it, vi } from "vitest";
import { completeSpotifyLogin, createSingleFlightRunner } from "./clientProvider.auth";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";

function createRouterStub(): AppRouterInstance {
    return {
        back: vi.fn(),
        forward: vi.fn(),
        push: vi.fn(),
        refresh: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((innerResolve) => {
        resolve = innerResolve;
    });

    return {
        promise,
        resolve,
    };
}

describe("completeSpotifyLogin", () => {
    it("returns the authenticated client and user profile after a successful callback exchange", async () => {
        const router = createRouterStub();
        const client = {} as SpotifyApi;
        const user = { id: "spotify-user" } as UserProfile;
        const clearSpotifyAuthCallbackParams = vi.fn();
        const logError = vi.fn();

        const result = await completeSpotifyLogin(router, {
            trySpotifyLogin: vi.fn(() => client),
            getUserProfile: vi.fn(async () => user),
            clearSpotifyAuthCallbackParams,
            isMissingSpotifyVerifierError: vi.fn(() => false),
            logError,
        });

        expect(result).toEqual({
            client,
            user,
        });
        expect(clearSpotifyAuthCallbackParams).not.toHaveBeenCalled();
        expect(logError).not.toHaveBeenCalled();
    });

    it("clears stale callback params and returns an empty auth state when the verifier is missing", async () => {
        const router = createRouterStub();
        const client = {} as SpotifyApi;
        const clearSpotifyAuthCallbackParams = vi.fn();
        const logError = vi.fn();

        const result = await completeSpotifyLogin(router, {
            trySpotifyLogin: vi.fn(() => client),
            getUserProfile: vi.fn(async () => {
                throw new Error("No verifier found in cache - can't validate query string callback parameters.");
            }),
            clearSpotifyAuthCallbackParams,
            isMissingSpotifyVerifierError: vi.fn(() => true),
            logError,
        });

        expect(result).toEqual({});
        expect(clearSpotifyAuthCallbackParams).toHaveBeenCalledTimes(1);
        expect(logError).not.toHaveBeenCalled();
    });

    it("logs unexpected login failures and returns an empty auth state", async () => {
        const router = createRouterStub();
        const client = {} as SpotifyApi;
        const error = new Error("Spotify unavailable");
        const clearSpotifyAuthCallbackParams = vi.fn();
        const logError = vi.fn();

        const result = await completeSpotifyLogin(router, {
            trySpotifyLogin: vi.fn(() => client),
            getUserProfile: vi.fn(async () => {
                throw error;
            }),
            clearSpotifyAuthCallbackParams,
            isMissingSpotifyVerifierError: vi.fn(() => false),
            logError,
        });

        expect(result).toEqual({});
        expect(clearSpotifyAuthCallbackParams).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('[SPOTIFY-ACCOUNT] Spotify login failed.', error);
    });
});

describe("createSingleFlightRunner", () => {
    it("deduplicates concurrent login attempts and allows a later retry after completion", async () => {
        let currentRequest = deferred<string>();
        const task = vi.fn(() => currentRequest.promise);
        const runOnce = createSingleFlightRunner(task);

        const firstRun = runOnce();
        const secondRun = runOnce();

        expect(task).toHaveBeenCalledTimes(1);
        expect(firstRun).toBe(secondRun);

        currentRequest.resolve("complete");
        await expect(firstRun).resolves.toBe("complete");

        currentRequest = deferred<string>();
        const thirdRun = runOnce();
        expect(task).toHaveBeenCalledTimes(2);

        currentRequest.resolve("second-complete");
        await expect(thirdRun).resolves.toBe("second-complete");
    });
});
