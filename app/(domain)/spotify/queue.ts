import { SpotifyApi, PlaybackState, Track, SimplifiedTrack } from "@spotify/web-api-ts-sdk";
import { QueueContextObject, DEFAULT_QUEUE_CONTEXT } from "../app/context";
import { getMarket } from "./profile";
import { trackItemsToTracks } from "./metadata";
import { DEBUG_QUEUE } from "../app/config";






// Syncing with Spotify

export async function syncQueue(client?: SpotifyApi, queueObject?: QueueContextObject, setQueueObject?: (state: QueueContextObject) => void) {
    if (!client || !queueObject || !setQueueObject || document.hidden) return;

    const externalQueue = await fetchQueue(client);

    if (externalQueue.length === 0) return;

    setQueueObject({
        ...queueObject,
        queue: externalQueue
    });

    if (DEBUG_QUEUE) console.log('[QUEUE] Synced queue:', {
        ...queueObject,
        queue: externalQueue
    }.queue.map((track) => track.name));

    return;
}

async function fetchQueue(client?: SpotifyApi): Promise<Track[]> {
    if (!client) return [];

    const queue = await client.player.getUsersQueue();

    if (queue) {
        return trackItemsToTracks(queue.queue);
    }

    return [];
}


// function combineTrackLists(tracks1?: SimplifiedTrack[], tracks2?: SimplifiedTrack[]): SimplifiedTrack[] {
//     if (!tracks1) return tracks2 || [];
//     if (!tracks2) return tracks1;

//     return tracks1.concat(tracks2.filter((track) => !tracks1.find((item) => item.id === track.id)));
// }

// function removeDuplicatesFromTrackList(tracks?: SimplifiedTrack[], filter?: SimplifiedTrack[]): SimplifiedTrack[] {
//     if (!tracks) return [];
//     if (!filter) return tracks;

//     return tracks.filter((track) => !filter.find((item) => item.id === track.id));
// }

// export async function indexOfContextStart(client: SpotifyApi, playbackState: PlaybackState, queueObject: QueueContextObject): Promise<number | undefined> {
//     if (!client || !playbackState || !queueObject) return -1;

//     const contextItems = await getContextItems(client, playbackState);

//     if (!contextItems) return -1;

//     let index = contextItems.length - 1;
//     while (index >= 0) {
//         if (queueObject.dynamicQueue.find((item) => item.id === contextItems[index].id))
//             index--;
//         else if (index === contextItems.length - 1)
//             return undefined;
//         else
//             return index + 1;
//     }
//     return 0;
// }

// async function getContextItems(client: SpotifyApi, playbackState: PlaybackState): Promise<SimplifiedTrack[]> {
//     if (!client || !playbackState) return [];

//     if (playbackState.context?.uri) {
//         const id = playbackState.context.uri.substring(playbackState.context.uri.lastIndexOf(':') + 1);

//         if (playbackState.context.type === 'playlist') {
//             const playlist = await client.playlists.getPlaylist(id);
//             return playlist.tracks.items.map((item) => item.track);
//         }
//         else if (playbackState.context.type === 'album') {
//             const album = await client.albums.get(id);
//             return album.tracks.items;
//         }
//         else if (playbackState.context.type === 'artist') {
//             const artist = await client.artists.topTracks(id, getMarket());
//             return artist.tracks;
//         }
//     }

//     return [];
// }




// export async function interruptTrackEnd(client?: SpotifyApi, playbackState?: PlaybackState, queueObject?: QueueContextObject, setQueueObject?: (state: QueueContextObject) => void) {
//     if (!client || !playbackState || !queueObject || !setQueueObject) return;

//     const nextTrack = getNextTrack(queueObject);
//     if (!nextTrack) return;

//     const spotifyQueue = await getQueueItems(client);
//     if (spotifyQueue[0] && nextTrack.id === spotifyQueue[0].id) {
//         if (DEBUG_QUEUE) console.log('[QUEUE] Defaulting to external queue for:', nextTrack);
//         return;
//     }

//     if (DEBUG_QUEUE) console.log('[QUEUE] Interrupting track change:', nextTrack);

//     client.player.addItemToPlaybackQueue(nextTrack.uri);

//     while (spotifyQueue.length > 0) {
//         if (DEBUG_QUEUE) console.log('[QUEUE] Skipping track:', spotifyQueue[0].name);
//         await client.player.skipToNext(playbackState.device.id ?? '');
//         delete spotifyQueue[0];
//     }

//     popTrack(queueObject, setQueueObject);
// }

// export function getNextTrack(queueObject?: QueueContextObject, offset?: number): SimplifiedTrack | undefined {
//     if (!queueObject) return undefined;
//     if (!offset) offset = 0;

//     if (queueObject.dynamicQueue.length > 0 + offset) {
//         return queueObject.dynamicQueue[0 + offset];
//     }
//     else if (queueObject.staticQueue && queueObject.staticQueue.length > 0 + offset) {
//         return queueObject.staticQueue[0 + offset];
//     }

//     return undefined;
// }

// export async function popTrack(queueObject?: QueueContextObject, setQueueObject?: (state: QueueContextObject) => void) {
//     if (!queueObject || !setQueueObject) return;
//     if (queueObject.dynamicQueue.length === 0 && queueObject.staticQueue && queueObject.staticQueue.length > 0) {
//         if (DEBUG_QUEUE) console.log('[QUEUE] Popping track:', queueObject.staticQueue[0]);
//         setQueueObject({
//             ...queueObject,
//             staticQueue: queueObject.staticQueue.slice(1)
//         });
//     }
//     else if (queueObject.dynamicQueue.length > 0) {
//         if (DEBUG_QUEUE) console.log('[QUEUE] Popping track:', queueObject.dynamicQueue[0]);
//         setQueueObject({
//             ...queueObject,
//             dynamicQueue: queueObject.dynamicQueue.slice(1)
//         });
//     }
//     else {
//         if (DEBUG_QUEUE) console.log('[QUEUE] No tracks to pop.');
//     }
// }