import { Market, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { DEBUG_ACCOUNT as LOG, DEFAULT_MARKET } from "../app/config";

const SPOTIFY_TOKEN_KEY = "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";
const PROFILE_REQUEST_TIMEOUT_MS = 12_000;

type GetUserProfileDependencies = {
    fetch: typeof fetch;
    loadStoredAccessToken: () => string | undefined;
};

const defaultDependencies: GetUserProfileDependencies = {
    fetch: (...args) => fetch(...args),
    loadStoredAccessToken,
};

export async function getUserProfile(
    client?: SpotifyApi,
    dependencies: GetUserProfileDependencies = defaultDependencies,
): Promise<UserProfile | undefined> {
    if (!client) return;

    try {
        const profile = await withTimeout(client.currentUser.profile(), PROFILE_REQUEST_TIMEOUT_MS);
        if (LOG) console.log('[SPOTIFY-ACCOUNT] User profile:', profile);
        return profile;
    } catch (error) {
        const accessToken = dependencies.loadStoredAccessToken();
        if (!accessToken)
            throw error;

        const profile = await fetchUserProfile(accessToken, dependencies);
        if (LOG) console.log('[SPOTIFY-ACCOUNT] User profile fallback:', profile);
        return profile;
    }
}

async function fetchUserProfile(accessToken: string, dependencies: GetUserProfileDependencies) {
    const response = await dependencies.fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok)
        throw new Error(`[SPOTIFY-ACCOUNT] Profile request failed with status ${response.status}.`);

    const profile = await response.json() as UserProfile;
    if (LOG) console.log('[SPOTIFY-ACCOUNT] User profile:', profile);
    return profile;
}

export function getMarket(user?: UserProfile): Market {
    return user?.country as Market ?? DEFAULT_MARKET as Market;
}

function loadStoredAccessToken() {
    if (typeof window === "undefined")
        return undefined;

    const rawToken = window.localStorage.getItem(SPOTIFY_TOKEN_KEY);
    if (!rawToken)
        return undefined;

    try {
        const token = JSON.parse(rawToken) as { access_token?: string; expires?: number };
        if (!token.access_token)
            return undefined;
        if (typeof token.expires === "number" && token.expires <= Date.now())
            return undefined;
        return token.access_token;
    } catch {
        return undefined;
    }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`[SPOTIFY-ACCOUNT] Profile request timed out after ${timeoutMs}ms.`));
        }, timeoutMs);

        promise.then((value) => {
            clearTimeout(timeoutId);
            resolve(value);
        }).catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
