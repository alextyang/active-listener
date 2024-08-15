import { Market, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { DEBUG_ACCOUNT as LOG, DEFAULT_MARKET } from "../app/config";

export async function getUserProfile(client?: SpotifyApi): Promise<UserProfile | undefined> {
    if (!client) return;

    const profile = await client.currentUser.profile();
    if (LOG) console.log('[SPOTIFY-ACCOUNT] User profile:', profile);

    return profile;
}
export function getMarket(user?: UserProfile): Market {
    return user?.country as Market ?? DEFAULT_MARKET as Market;
}