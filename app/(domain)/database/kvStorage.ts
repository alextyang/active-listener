// "use server";

// import { kv } from '@vercel/kv';
// import LZString from 'lz-string';
// import { PlaylistTrackDict, PlaylistIDDict } from './(domain)/context';

// export async function saveUsersPlaylists(userId: string, playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict) {
//     const combinedDict = { playlistTrackDict: playlistTrackDict, playlistIDDict: playlistIDDict };
//     const compressedObj = { combinedDict: LZString.compress(JSON.stringify(combinedDict)) };


//     try {
//         await kv.set<string>('userPlaylistDict:' + userId, JSON.stringify(compressedObj));
//         console.log('[KV] Saved user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
//     }
//     catch (e) {
//         console.error('[KV] Error setting user ' + userId + ' playlists:', e);
//     }
// }

// export async function loadUsersPlaylists(userId: string): Promise<{ playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict } | undefined> {
//     const res = await kv.get<{ combinedDict: string }>('userPlaylistDict:' + userId);
//     if (!res) {
//         console.log('[KV] No playlists found for user ' + userId);
//         return undefined;
//     }
//     // console.log(res);

//     let combinedDict;
//     try {
//         const decompressedObj = JSON.parse(LZString.decompress(res.combinedDict));
//         combinedDict = decompressedObj as { playlistTrackDict: PlaylistTrackDict, playlistIDDict: PlaylistIDDict };
//     } catch (error) {
//         console.error('[KV] Error parsing user ' + userId + ' playlists:', error);
//         return undefined;
//     }

//     console.log('[KV] Loaded user ' + userId + ' playlists:', Object.keys(combinedDict.playlistIDDict).length);
//     return combinedDict;
// }