import { Page, Playlist, SimplifiedPlaylist, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import {
    DEBUG_LIBRARY_PLAYLIST_SYNC as LOG,
    LIBRARY_SETTINGS,
    MAX_USER_PLAYLISTS,
    PLAYLIST_CACHE_VERSION,
    PLAYLIST_FETCH_LIMIT,
    PLAYLIST_REQUEST_DELAY,
    PLAYLIST_STORAGE_KEY,
    PLAYLIST_SYNC_INTERVAL,
    PLAYLIST_SYNC_TIMESTAMP_KEY,
} from "../app/config";
import { LibrarySyncState, PlaylistDict } from "../app/context";
import { loadLocalItem, saveLocalItem } from "../browser/localStorage";
import { wait } from "../utilities/fetch";

type PlaylistCacheIdentity = {
    userId?: string;
    cacheVersion?: string;
};

type PlaylistSyncOptions = {
    identity?: PlaylistCacheIdentity;
    signal?: AbortSignal;
};

type CachedPlaylistSync = {
    promise: Promise<PlaylistDict | undefined>;
    signal?: AbortSignal;
};

const inFlightPlaylistSyncs = new Map<string, CachedPlaylistSync>();

export async function syncUserPlaylists(
    client: SpotifyApi | undefined,
    libraryState: LibrarySyncState,
    isManualRefresh: boolean,
    setLibraryState?: (state: LibrarySyncState) => void,
    options?: PlaylistSyncOptions,
): Promise<PlaylistDict | undefined> {
    if (!client) {
        if (setLibraryState) setLibraryState({ state: 'waiting' });
        return;
    }

    if (options?.signal?.aborted) {
        if (setLibraryState) setLibraryState({ state: 'waiting' });
        return;
    }

    const cacheKeys = buildPlaylistCacheKeys(options?.identity);
    const inFlightSync = inFlightPlaylistSyncs.get(cacheKeys.playlistDictKey);
    if (inFlightSync && !inFlightSync.signal?.aborted) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Reusing in-flight sync for current user.');
        return inFlightSync.promise;
    }

    if (inFlightSync?.signal?.aborted) {
        inFlightPlaylistSyncs.delete(cacheKeys.playlistDictKey);
    }

    const syncPromise = (async () => {
        const lastSyncAt = loadLibraryTimestamp(options?.identity);
        if (!shouldAutoSyncPlaylists(libraryState, isManualRefresh, lastSyncAt)) {
            if (LOG) console.log('[LIBRARY-PLAYLISTS] Too soon to resync playlists.');
            if (setLibraryState) setLibraryState({ state: 'library' });
            const cachedPlaylists = loadPlaylistDict(options?.identity);
            if (setLibraryState) setLibraryState({ state: 'waiting' });
            return cachedPlaylists;
        }

        if (LOG) console.log('[LIBRARY-PLAYLISTS] Refreshing playlists for current user.');
        if (setLibraryState) setLibraryState({ state: 'library' });

        const oldPlaylistDict = loadPlaylistDict(options?.identity);
        const simplifiedPlaylists = await getUserSimplifiedPlaylists(client, {
            identity: options?.identity,
            signal: options?.signal,
        });

        if (options?.signal?.aborted) return;

        if (!simplifiedPlaylists.length) {
            if (LOG) console.log('[LIBRARY-PLAYLISTS] No playlists found for current user.');
            if (setLibraryState) setLibraryState({ state: 'waiting' });
            const emptyPlaylistDict: PlaylistDict = { tracks: {}, playlists: {} };
            savePlaylistDict(emptyPlaylistDict, options?.identity);
            return emptyPlaylistDict;
        }

        let newPlaylistDict: PlaylistDict;
        if (oldPlaylistDict && isValidPlaylistDict(oldPlaylistDict)) {
            newPlaylistDict = await updatePlaylistDict(client, simplifiedPlaylists, oldPlaylistDict, setLibraryState, {
                identity: options?.identity,
                signal: options?.signal,
            });
        } else {
            newPlaylistDict = await createPlaylistDict(client, simplifiedPlaylists, setLibraryState, {
                identity: options?.identity,
                signal: options?.signal,
            });
        }

        if (options?.signal?.aborted) return;

        if (setLibraryState) setLibraryState({ state: 'waiting' });
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Successfully synced playlists:', Object.keys(newPlaylistDict.playlists).length);

        savePlaylistDict(newPlaylistDict, options?.identity);
        return newPlaylistDict;
    })();

    inFlightPlaylistSyncs.set(cacheKeys.playlistDictKey, {
        promise: syncPromise,
        signal: options?.signal,
    });

    try {
        return await syncPromise;
    } finally {
        const activeSync = inFlightPlaylistSyncs.get(cacheKeys.playlistDictKey);
        if (activeSync?.promise === syncPromise) {
            inFlightPlaylistSyncs.delete(cacheKeys.playlistDictKey);
        }
    }
}

export function shouldAutoSyncPlaylists(libraryState: LibrarySyncState, isManualRefresh: boolean, lastSyncAt?: number): boolean {
    void libraryState;
    if (isManualRefresh) return true;
    return Date.now() - (lastSyncAt ?? 0) > PLAYLIST_SYNC_INTERVAL;
}

export function buildPlaylistCacheKeys(identity?: PlaylistCacheIdentity): { playlistDictKey: string; lastSyncKey: string } {
    const cacheVersion = identity?.cacheVersion?.trim() || PLAYLIST_CACHE_VERSION;
    const userSegment = normalizeCacheSegment(identity?.userId);
    const namespace = `${PLAYLIST_STORAGE_KEY}:${cacheVersion}:${userSegment}`;

    return {
        playlistDictKey: namespace,
        lastSyncKey: `${PLAYLIST_SYNC_TIMESTAMP_KEY}:${cacheVersion}:${userSegment}`,
    };
}

export function isValidPlaylistDict(playlistDict: PlaylistDict | undefined): boolean {
    return playlistDict !== undefined && playlistDict.playlists !== undefined && playlistDict.tracks !== undefined;
}

export async function createPlaylistDict(client: SpotifyApi, playlists: SimplifiedPlaylist[], setLibraryState?: (state: LibrarySyncState) => void, options?: PlaylistSyncOptions): Promise<PlaylistDict> {
    const populatedPlaylists = await getPopulatedPlaylists(client, playlists, setLibraryState, options);
    const playlistDict: PlaylistDict = { tracks: {}, playlists: {} };

    if (LOG) console.log('[LIBRARY-PLAYLISTS] Creating ' + playlists.length + ' playlist dict.');

    return addPlaylistsToDict(playlists, populatedPlaylists, playlistDict);
}

export async function updatePlaylistDict(client: SpotifyApi, playlists: SimplifiedPlaylist[], oldPlaylistDict: PlaylistDict, setLibraryState?: (state: LibrarySyncState) => void, options?: PlaylistSyncOptions): Promise<PlaylistDict> {
    const newPlaylists = getNewPlaylists(playlists, oldPlaylistDict);
    const updatedPlaylists = getUpdatedPlaylists(playlists, oldPlaylistDict);
    const deletedPlaylists = getDeletedPlaylists(playlists, oldPlaylistDict);

    const playlistsToRemove = updatedPlaylists.concat(deletedPlaylists);
    const playlistsToAdd = newPlaylists.concat(updatedPlaylists);

    if (LOG) console.log('[LIBRARY-PLAYLISTS] Deleting ' + deletedPlaylists.length + ' playlists, Adding ' + newPlaylists.length + ' playlists, Updating ' + updatedPlaylists.length + ' playlists.');

    const trimmedDict = removePlaylistsFromDict(playlistsToRemove, oldPlaylistDict);
    const populatedPlaylistsToAdd = await getPopulatedPlaylists(client, playlistsToAdd, setLibraryState, options);
    return addPlaylistsToDict(playlistsToAdd, populatedPlaylistsToAdd, trimmedDict);
}

export async function getUserSimplifiedPlaylists(client: SpotifyApi, options?: PlaylistSyncOptions): Promise<SimplifiedPlaylist[]> {
    const firstPage = await client.currentUser.playlists.playlists(PLAYLIST_FETCH_LIMIT);
    const playlistPage: Page<SimplifiedPlaylist>[] = [firstPage];
    const playlists = [...firstPage.items];

    while (playlistPage[playlistPage.length - 1].next) {
        if (options?.signal?.aborted) return playlists;
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Downloading playlists...', playlists);

        await wait(PLAYLIST_REQUEST_DELAY);
        if (options?.signal?.aborted) return playlists;

        const nextPage = await client.currentUser.playlists.playlists(PLAYLIST_FETCH_LIMIT, PLAYLIST_FETCH_LIMIT * playlistPage.length);
        playlistPage.push(nextPage);
        playlists.push(...nextPage.items);
    }

    return playlists;
}

export async function getPopulatedPlaylists(client: SpotifyApi, playlists: SimplifiedPlaylist[], setLibraryState?: (state: LibrarySyncState) => void, options?: PlaylistSyncOptions): Promise<Playlist[]> {
    const limitedPlaylists = playlists.length > MAX_USER_PLAYLISTS ? playlists.slice(0, MAX_USER_PLAYLISTS) : playlists;

    if (playlists.length > MAX_USER_PLAYLISTS && LOG) {
        console.log('[LIBRARY-PLAYLISTS] Too many playlists to download, only syncing first ' + MAX_USER_PLAYLISTS + ' playlists.');
    }

    const playlistIDs = limitedPlaylists.map((playlist) => playlist.id);
    const populatedPlaylists: Playlist[] = [];

    for (let playlistIndex = 0; playlistIndex < playlistIDs.length; playlistIndex++) {
        const playlistID = playlistIDs[playlistIndex];
        if (options?.signal?.aborted) return populatedPlaylists;

        if (LOG) console.log('[LIBRARY-PLAYLISTS] Syncing playlists (' + playlistIndex + ' / ' + playlistIDs.length + ')', limitedPlaylists[playlistIndex]);
        if (setLibraryState) {
            setLibraryState({ state: 'playlists', percent: Math.round((playlistIndex / Math.max(playlistIDs.length, 1)) * 100) });
        }

        const [playlist] = await Promise.all([
            getPopulatedPlaylist(client, playlistID, options),
            wait(PLAYLIST_REQUEST_DELAY),
        ]);

        if (options?.signal?.aborted) return populatedPlaylists;
        populatedPlaylists.push(playlist);
    }

    return populatedPlaylists;
}

export async function getPopulatedPlaylist(client: SpotifyApi, playlistID: string, options?: PlaylistSyncOptions): Promise<Playlist> {
    const playlist = await client.playlists.getPlaylist(playlistID);
    while (playlist.tracks.next) {
        if (options?.signal?.aborted) return playlist;

        const nextTracks = await client.playlists.getPlaylistItems(playlistID, undefined, undefined, PLAYLIST_FETCH_LIMIT, playlist.tracks.items.length);
        playlist.tracks.items.push(...nextTracks.items);
        playlist.tracks.next = nextTracks.next;
    }

    return playlist;
}

function getUpdatedPlaylists(playlists: SimplifiedPlaylist[], playlistDict: PlaylistDict): SimplifiedPlaylist[] {
    return playlists.filter((playlist) => playlistDict.playlists[playlist.id] && playlistDict.playlists[playlist.id].snapshot_id != playlist.snapshot_id);
}

function getNewPlaylists(playlists: SimplifiedPlaylist[], playlistDict: PlaylistDict): SimplifiedPlaylist[] {
    return playlists.filter((playlist) => !playlistDict.playlists[playlist.id]);
}

function getDeletedPlaylists(playlists: SimplifiedPlaylist[], playlistDict: PlaylistDict): SimplifiedPlaylist[] {
    return Object.values(playlistDict.playlists).filter((playlist) => !playlists.find((newPlaylist) => newPlaylist.id === playlist.id));
}

function removePlaylistsFromDict(playlists: SimplifiedPlaylist[], playlistDict: PlaylistDict): PlaylistDict {
    const newPlaylistDict: PlaylistDict = {
        tracks: { ...playlistDict.tracks },
        playlists: { ...playlistDict.playlists },
    };

    for (const playlist of playlists) {
        delete newPlaylistDict.playlists[playlist.id];
    }

    for (const trackId of Object.keys(newPlaylistDict.tracks)) {
        const remainingPlaylistIds = newPlaylistDict.tracks[trackId].filter((playlistId) => !playlists.find((playlist) => playlist.id === playlistId));
        if (remainingPlaylistIds.length > 0) {
            newPlaylistDict.tracks[trackId] = remainingPlaylistIds;
        } else {
            delete newPlaylistDict.tracks[trackId];
        }
    }

    return newPlaylistDict;
}

function addPlaylistsToDict(playlists: SimplifiedPlaylist[], populatedPlaylists: Playlist[], playlistDict: PlaylistDict): PlaylistDict {
    const newPlaylistDict: PlaylistDict = {
        tracks: { ...playlistDict.tracks },
        playlists: { ...playlistDict.playlists },
    };

    for (const playlist of playlists) {
        const populatedPlaylist = populatedPlaylists.find((candidate) => candidate.id === playlist.id);
        if (!populatedPlaylist) continue;

        newPlaylistDict.playlists[playlist.id] = playlist;

        for (const track of populatedPlaylist.tracks.items) {
            const trackID = track?.track?.id;
            if (!trackID) continue;

            if (!newPlaylistDict.tracks[trackID]) {
                newPlaylistDict.tracks[trackID] = [];
            }

            if (!newPlaylistDict.tracks[trackID].includes(populatedPlaylist.id)) {
                newPlaylistDict.tracks[trackID].push(populatedPlaylist.id);
            }
        }
    }

    return newPlaylistDict;
}

function savePlaylistDict(playlistDict: PlaylistDict, identity?: PlaylistCacheIdentity) {
    const cacheKeys = buildPlaylistCacheKeys(identity);
    saveLocalItem(cacheKeys.playlistDictKey, playlistDict);
    saveLocalItem(cacheKeys.lastSyncKey, Date.now());
}

function loadPlaylistDict(identity?: PlaylistCacheIdentity): PlaylistDict | undefined {
    const cacheKeys = buildPlaylistCacheKeys(identity);
    const playlistDict = loadLocalItem<PlaylistDict>(cacheKeys.playlistDictKey);

    if (LOG && (!playlistDict?.playlists || !playlistDict?.tracks)) {
        console.log('[LIBRARY-PLAYLISTS] No cached playlists found for current user.');
    } else if (LOG && playlistDict) {
        console.log('[LIBRARY-PLAYLISTS] Loaded cached playlists:', Object.keys(playlistDict.playlists).length);
    }

    return playlistDict;
}

function loadLibraryTimestamp(identity?: PlaylistCacheIdentity): number | undefined {
    const cacheKeys = buildPlaylistCacheKeys(identity);
    const timestamp = loadLocalItem<number>(cacheKeys.lastSyncKey);
    if (timestamp) return timestamp;
    return;
}

export function getTracksPlaylists(trackID?: string, playlistDict?: PlaylistDict, user?: UserProfile): SimplifiedPlaylist[] {
    if (!trackID || !playlistDict) return [];

    const playlists = playlistDict.tracks[trackID]?.map((playlistID) => playlistDict.playlists[playlistID]).filter((playlist) => playlist !== undefined) ?? [];
    const uniquePlaylists = Array.from(new Map(playlists.map((playlist) => [playlist.id, playlist])).values());

    return sortTrackPlaylists(uniquePlaylists, user);
}

function sortTrackPlaylists(playlists: SimplifiedPlaylist[], user?: UserProfile): SimplifiedPlaylist[] {
    return playlists.sort((a, b) => {
        let aScore = 0, bScore = 0;

        if (a.owner.display_name === 'Spotify')
            aScore -= 1;
        if (b.owner.display_name === 'Spotify')
            bScore -= 1;

        if (a.name.includes('Mix'))
            aScore -= 1;
        if (b.name.includes('Mix'))
            bScore -= 1;

        if (user && a.owner.id === user.id)
            aScore += 1;
        if (user && b.owner.id === user.id)
            bScore += 1;

        return bScore - aScore;
    });
}

export function getLoadingMessage(libraryState: LibrarySyncState, playlistDict?: PlaylistDict): string {
    if (libraryState.state === 'waiting' && playlistDict)
        return LIBRARY_SETTINGS.LOADING_MESSAGES['done'];
    else if (libraryState.state === 'playlists')
        return LIBRARY_SETTINGS.LOADING_MESSAGES['playlists'] + ' (' + libraryState.percent + '%)';
    else
        return LIBRARY_SETTINGS.LOADING_MESSAGES[libraryState.state] ?? '';
}

function normalizeCacheSegment(value?: string): string {
    const trimmed = value?.trim();
    return encodeURIComponent(trimmed && trimmed.length > 0 ? trimmed : 'anonymous');
}
