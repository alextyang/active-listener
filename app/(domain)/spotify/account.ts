import { IRedirectionStrategy, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { DEBUG_ACCOUNT as LOG, SPOTIFY_SCOPES } from "../app/config";
import { hasLocalKey } from "../browser/localStorage";

const SPOTIFY_TOKEN_KEY = "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";
const SPOTIFY_CALLBACK_PARAMS = ["code", "state", "error"];
const MISSING_SPOTIFY_VERIFIER_MESSAGE = "No verifier found in cache";

export function shouldAutoLogin(client: SpotifyApi | undefined): boolean {
    if (client) return false;

    if (hasSpotifyToken()) {
        if (LOG) console.log('[SPOTIFY-ACCOUNT] Found existing token, attempting login...');
        return true;
    }

    if (hasSpotifyAuthCallback()) {
        if (LOG) console.log('[SPOTIFY-ACCOUNT] Found Spotify callback params, completing login...');
        return true;
    }

    return false;
}

function hasSpotifyToken(): boolean {
    return hasLocalKey(SPOTIFY_TOKEN_KEY);
}

export function hasSpotifyAuthCallback(): boolean {
    if (typeof window === "undefined") return false;

    const params = new URLSearchParams(window.location.search);
    return params.has("code");
}

export function clearSpotifyAuthCallbackParams(): void {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    let didChange = false;

    for (const param of SPOTIFY_CALLBACK_PARAMS) {
        if (!url.searchParams.has(param)) continue;
        url.searchParams.delete(param);
        didChange = true;
    }

    if (!didChange) return;

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, nextUrl || "/");
}

export function isMissingSpotifyVerifierError(error: unknown): boolean {
    return error instanceof Error && error.message.includes(MISSING_SPOTIFY_VERIFIER_MESSAGE);
}


export function trySpotifyLogin(
    router: AppRouterInstance): SpotifyApi | undefined {

    if (LOG) console.log('[SPOTIFY-ACCOUNT] Attempting Spotify login or redirect...');

    // Use router for redirecting
    class DocumentLocationRedirectionStrategy implements IRedirectionStrategy {
        router: AppRouterInstance;
        constructor(router: AppRouterInstance) {
            this.router = router;
        }

        public async redirect(targetUrl: string | URL): Promise<void> {
            if (LOG) console.log(targetUrl);
            router.push(targetUrl.toString());
        }

        public async onReturnFromRedirect(): Promise<void> {
        }
    }

    // Attempt Spotify login
    let client = undefined;
    try {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
        const redirectUri = resolveSpotifyRedirectUri();
        if (!clientId || !redirectUri)
            return undefined;

        client = SpotifyApi.withUserAuthorization(clientId, redirectUri, [...SPOTIFY_SCOPES], { redirectionStrategy: new DocumentLocationRedirectionStrategy(router) });
    } catch (error) {
        console.error('[SPOTIFY-ACCOUNT] Spotify login failed.', error);
    }
    if (LOG) console.log('[SPOTIFY-ACCOUNT] Spotify login successful.');

    return client;
}

export function resolveSpotifyRedirectUri(): string {
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredOrigin)
        return new URL('/', ensureAbsoluteOrigin(configuredOrigin)).toString();

    if (typeof window === 'undefined')
        return '';

    return new URL('/', window.location.origin).toString();
}


export function trySpotifyLogout(
    spotifyClient: SpotifyApi | undefined,
    setSpotifyClient: React.Dispatch<React.SetStateAction<SpotifyApi | undefined>>,
    router: AppRouterInstance) {

    if (!spotifyClient) return;
    if (LOG) console.log('[SPOTIFY-ACCOUNT] Logging out...');

    spotifyClient.logOut();
    setSpotifyClient(undefined);

    router.push('/');
};

function ensureAbsoluteOrigin(value: string): string {
    const normalized = value.replace(/\/+$/, '');
    if (normalized.startsWith('http://') || normalized.startsWith('https://'))
        return normalized;
    return `https://${normalized}`;
}
