import { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";

export async function getUserProfile(client?: SpotifyApi): Promise<UserProfile | undefined> {
    if (!client) return;

    const profile = await client.currentUser.profile();

    return profile;
}