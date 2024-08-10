"use server";

import { kv } from '@vercel/kv';
import { PlaylistTrackDict, PlaylistIDDict } from './context';

export async function saveUsersPlaylists(userId: string, playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict) {
    const combinedDict = { playlistTrackDict: playlistTrackDict, playlistIDDict: playlistIDDict };
    try {
        await kv.set<string>('userPlaylistDict:' + userId, JSON.stringify(combinedDict));
        console.log('[KV] Set user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
    }
    catch (e) {
        console.error('[KV] Error setting user ' + userId + ' playlists:', e);
    }
}

export async function loadUsersPlaylists(userId: string): Promise<{ playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict } | undefined> {
    const res = await kv.get<{ playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict }>('userPlaylistDict:' + userId);
    if (!res) {
        console.log('[KV] No playlists found for user ' + userId);
        return undefined;
    }

    let combinedDict;
    try {
        combinedDict = res as { playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict };
    } catch (error) {
        console.error('[KV] Error parsing user ' + userId + ' playlists:', error);
        return undefined;
    }

    console.log('[KV] Loaded user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
    return combinedDict;
}