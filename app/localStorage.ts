"use client";

import LZString from 'lz-string';
import { PlaylistTrackDict, PlaylistIDDict } from './context';

export async function saveUsersPlaylists(userId: string, playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict) {
    const combinedDict = { playlistTrackDict: playlistTrackDict, playlistIDDict: playlistIDDict };

    try {
        localStorage.setItem('userPlaylistDict', LZString.compress(JSON.stringify(combinedDict)));
        console.log('[LocalStorage] Saved user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
    }
    catch (e) {
        console.error('[LocalStorage] Error setting user ' + userId + ' playlists:', e);
    }
}

export async function loadUsersPlaylists(userId: string): Promise<{ playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict } | undefined> {
    const res = localStorage.getItem('userPlaylistDict');
    if (!res) {
        console.log('[LocalStorage] No playlists found for user ' + userId);
        return undefined;
    }
    // console.log(res);

    let combinedDict;
    try {
        const decompressedObj = JSON.parse(LZString.decompress(res));
        combinedDict = decompressedObj as { playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict };
    } catch (error) {
        console.error('[LocalStorage] Error parsing user ' + userId + ' playlists:', error);
        return undefined;
    }

    console.log('[LocalStorage] Loaded user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
    return combinedDict;
}