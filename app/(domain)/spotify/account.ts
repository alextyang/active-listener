import { IRedirectionStrategy, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SPOTIFY_CLIENT_ID, LOGIN_REDIRECT_URI } from "../config";
import { hasLocalKey } from "../browser/localStorage";


export function shouldAutoLogin(client: SpotifyApi | undefined): boolean {
    const should = !client && hasSpotifyToken();
    if (should)
        console.log('[SPOTIFY-ACCOUNT] Found existing token, attempting login...');
    return should;
}

function hasSpotifyToken(): boolean {
    return hasLocalKey('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token');
}


export function trySpotifyLogin(
    router: AppRouterInstance): SpotifyApi | undefined {

    console.log('[SPOTIFY-ACCOUNT] Attempting Spotify login or redirect...');

    // Use router for redirecting
    class DocumentLocationRedirectionStrategy implements IRedirectionStrategy {
        router: AppRouterInstance;
        constructor(router: AppRouterInstance) {
            this.router = router;
        }

        public async redirect(targetUrl: string | URL): Promise<void> {
            console.log(targetUrl);
            router.push(targetUrl.toString());
        }

        public async onReturnFromRedirect(): Promise<void> {
        }
    }

    // Attempt Spotify login
    let client = undefined;
    try {
        client = SpotifyApi.withUserAuthorization(SPOTIFY_CLIENT_ID, LOGIN_REDIRECT_URI, ['user-read-currently-playing', 'user-modify-playback-state', 'user-read-playback-state', 'user-library-read', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative'], { redirectionStrategy: new DocumentLocationRedirectionStrategy(router) });
    } catch (error) {
        console.error('[SPOTIFY-ACCOUNT] Spotify login failed.', error);
    }
    console.log('[SPOTIFY-ACCOUNT] Spotify login successful.');

    return client;
}


export function trySpotifyLogout(
    spotifyClient: SpotifyApi | undefined,
    setSpotifyClient: React.Dispatch<React.SetStateAction<SpotifyApi | undefined>>,
    router: AppRouterInstance) {

    if (!spotifyClient) return;

    spotifyClient.logOut();
    setSpotifyClient(undefined);

    router.push('/');
};