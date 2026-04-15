"use server";

import { Track } from "@spotify/web-api-ts-sdk";
import { searchTracks } from "@/app/(domain)/server/spotifyService";

export async function searchSongs(query: string): Promise<Track[]> {
    if (!query.trim()) return [];
    return searchTracks(query);
}
