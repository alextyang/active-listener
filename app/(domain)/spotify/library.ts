import { Page, Playlist, SimplifiedPlaylist, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { DEBUG_LIBRARY_PLAYLIST_SYNC as LOG, MAX_USER_PLAYLISTS, PLAYLIST_FETCH_LIMIT, PLAYLIST_STORAGE_KEY, PLAYLIST_REQUEST_DELAY, PLAYLIST_SYNC_INTERVAL, LIBRARY_SETTINGS } from "../app/config";
import { LibrarySyncState, PlaylistDict } from "../app/context";
import { loadLocalItem, saveLocalItem } from "../browser/localStorage";
import { wait } from "../utilities/fetch";


export async function syncUserPlaylists(client: SpotifyApi | undefined, libraryState: LibrarySyncState, isManualRefresh: boolean, setLibraryState?: (state: LibrarySyncState) => void): Promise<PlaylistDict | undefined> {
    if (!client || libraryState.state !== 'waiting') {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] No client or already syncing');
        if (setLibraryState) setLibraryState({ state: 'waiting' });
        return;
    }

    if (!shouldAutoSyncPlaylists(libraryState, isManualRefresh)) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Too soon to resync playlists.');
        if (setLibraryState) setLibraryState({ state: 'library' });
        const oldPlaylistDict = loadPlaylistDict();
        if (setLibraryState) setLibraryState({ state: 'waiting' });
        return oldPlaylistDict;
    }

    if (setLibraryState) setLibraryState({ state: 'library' });
    const oldPlaylistDict = loadPlaylistDict();
    const simplifiedPlaylists = await getUserSimplifiedPlaylists(client, setLibraryState);

    if (!simplifiedPlaylists) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] No playlists found for current user.');
        if (setLibraryState)
            setLibraryState({ state: 'waiting' });
        return;
    }

    let newPlaylistDict: PlaylistDict;
    if (oldPlaylistDict && isValidPlaylistDict(oldPlaylistDict))
        newPlaylistDict = await updatePlaylistDict(client, simplifiedPlaylists, oldPlaylistDict, setLibraryState);
    else
        newPlaylistDict = await createPlaylistDict(client, simplifiedPlaylists, setLibraryState);


    if (setLibraryState)
        setLibraryState({ state: 'waiting' });
    if (LOG) console.log('[LIBRARY-PLAYLISTS] Successfully synced playlists:', Object.keys(newPlaylistDict.playlists).length);

    savePlaylistDict(newPlaylistDict);
    return newPlaylistDict;
}

export function shouldAutoSyncPlaylists(libraryState: LibrarySyncState, isManualRefresh: boolean): boolean {
    return isManualRefresh ? true : (Date.now() - (loadLibraryTimestamp() ?? 0)) > PLAYLIST_SYNC_INTERVAL;
}

export function isValidPlaylistDict(playlistDict: PlaylistDict | undefined): boolean {
    return playlistDict !== undefined && playlistDict?.playlists !== undefined && playlistDict?.tracks !== undefined && Object.keys(playlistDict?.playlists).length > 0 && Object.keys(playlistDict?.tracks).length > 0;
}

export async function createPlaylistDict(client: SpotifyApi, playlists: SimplifiedPlaylist[], setLibraryState?: (state: LibrarySyncState) => void): Promise<PlaylistDict> {
    const populatedPlaylists = await getPopulatedPlaylists(client, playlists, setLibraryState);
    const playlistDict: PlaylistDict = { tracks: {}, playlists: {} };

    if (LOG) console.log('[LIBRARY-PLAYLISTS] Creating ' + playlists.length + ' playlist dict.');

    return addPlaylistsToDict(playlists, populatedPlaylists, playlistDict);
}

export async function updatePlaylistDict(client: SpotifyApi, playlists: SimplifiedPlaylist[], oldPlaylistDict: PlaylistDict, setLibraryState?: (state: LibrarySyncState) => void): Promise<PlaylistDict> {
    const newPlaylists = getNewPlaylists(playlists, oldPlaylistDict);
    const updatedPlaylists = getUpdatedPlaylists(playlists, oldPlaylistDict);
    const deletedPlaylists = getDeletedPlaylists(playlists, oldPlaylistDict);

    const playlistsToRemove = updatedPlaylists.concat(deletedPlaylists);
    const playlistsToAdd = newPlaylists.concat(updatedPlaylists);

    if (LOG) console.log('[LIBRARY-PLAYLISTS] Deleting ' + deletedPlaylists.length + ' playlists, Adding ' + newPlaylists.length + ' playlists, Updating ' + updatedPlaylists.length + ' playlists.');

    const trimmedDict = removePlaylistsFromDict(playlistsToRemove, oldPlaylistDict);
    const populatedPlaylistsToAdd = await getPopulatedPlaylists(client, playlistsToAdd, setLibraryState);
    const newPlaylistDict = addPlaylistsToDict(playlistsToAdd, populatedPlaylistsToAdd, trimmedDict);

    return newPlaylistDict;
}

export async function getUserSimplifiedPlaylists(client: SpotifyApi, setLibraryState?: (state: LibrarySyncState) => void): Promise<SimplifiedPlaylist[]> {
    const playlistPage: Page<SimplifiedPlaylist>[] = [await client.currentUser.playlists.playlists(PLAYLIST_FETCH_LIMIT)];
    const playlists = playlistPage[0].items;

    while (playlistPage[playlistPage.length - 1].next) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Downloading playlists...', playlists);

        await new Promise((resolve) => setTimeout(resolve, PLAYLIST_REQUEST_DELAY));
        playlistPage.push(await client.currentUser.playlists.playlists(PLAYLIST_FETCH_LIMIT, PLAYLIST_FETCH_LIMIT * playlistPage.length));
        playlists.push(...playlistPage[playlistPage.length - 1].items);
    }
    return playlists;
}

export async function getPopulatedPlaylists(client: SpotifyApi, playlists: SimplifiedPlaylist[], setLibraryState?: (state: LibrarySyncState) => void): Promise<Playlist[]> {
    if (playlists.length > MAX_USER_PLAYLISTS) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Too many playlists to download, only syncing first ' + MAX_USER_PLAYLISTS + ' playlists.');
        playlists.splice(MAX_USER_PLAYLISTS, playlists.length - MAX_USER_PLAYLISTS);
    }

    const playlistIDs = playlists.map((playlist) => playlist.id);

    let populatedPlaylists: Playlist[] = [];

    for (const playlistID of playlistIDs) {
        if (LOG) console.log('[LIBRARY-PLAYLISTS] Syncing playlists (' + playlistIDs.indexOf(playlistID) + ' / ' + playlistIDs.length + ')', playlists[playlistIDs.indexOf(playlistID)]);
        if (setLibraryState)
            setLibraryState({ state: 'playlists', percent: Math.round(playlistIDs.indexOf(playlistID) / playlistIDs.length * 100) });

        const [playlist] = await Promise.all([
            getPopulatedPlaylist(client, playlistID),
            wait(PLAYLIST_REQUEST_DELAY)
        ]);

        populatedPlaylists.push(playlist);
    }

    return populatedPlaylists;
}

export async function getPopulatedPlaylist(client: SpotifyApi, playlistID: string): Promise<Playlist> {
    const playlist = await client.playlists.getPlaylist(playlistID);
    while (playlist.tracks.next) {
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
    const newPlaylistDict = { ...playlistDict };

    for (const playlist of playlists) {
        delete newPlaylistDict.playlists[playlist.id];
    }

    for (const trackId in newPlaylistDict.tracks) {
        newPlaylistDict.tracks[trackId] = newPlaylistDict.tracks[trackId].filter((playlistId) => !playlists.find((playlist) => playlist.id === playlistId));
    }

    return newPlaylistDict;
}

function addPlaylistsToDict(playlists: SimplifiedPlaylist[], populatedPlaylists: Playlist[], playlistDict: PlaylistDict): PlaylistDict {
    const newPlaylistDict: PlaylistDict = { ...playlistDict };

    for (const playlist of playlists) {
        const populatedPlaylist = populatedPlaylists.find((populatedPlaylist) => populatedPlaylist.id === playlist.id);
        if (!populatedPlaylist) continue;

        newPlaylistDict.playlists[playlist.id] = playlist;

        for (const track of populatedPlaylist.tracks.items) {
            const trackID = track?.track?.id;
            if (!trackID) continue;

            if (!newPlaylistDict.tracks[trackID])
                newPlaylistDict.tracks[trackID] = [];

            newPlaylistDict.tracks[trackID].push(populatedPlaylist.id);
        }
    }

    return newPlaylistDict;
}


function savePlaylistDict(playlistDict: PlaylistDict) {
    saveLocalItem(PLAYLIST_STORAGE_KEY, playlistDict);
    saveLocalItem('lastPlaylistSync', Date.now());
}

function loadPlaylistDict(): PlaylistDict | undefined {
    const playlistDict = loadLocalItem<PlaylistDict>(PLAYLIST_STORAGE_KEY);

    if (LOG && (!playlistDict?.playlists || !playlistDict?.tracks))
        console.log('[LIBRARY-PLAYLISTS] No cached playlists found for current user');
    else if (LOG && playlistDict)
        console.log('[LIBRARY-PLAYLISTS] Loaded cached playlists:', Object.keys(playlistDict.playlists).length);

    return playlistDict;
}

function loadLibraryTimestamp(): number | undefined {
    const timestamp = loadLocalItem<number>('lastPlaylistSync');
    if (timestamp)
        return timestamp;
    return;
}

export function getTracksPlaylists(trackID?: string, playlistDict?: PlaylistDict, user?: UserProfile): SimplifiedPlaylist[] {
    if (!trackID || !playlistDict) return [];
    const playlists = playlistDict.tracks[trackID]?.map((playlistID) => playlistDict.playlists[playlistID]).filter((playlist) => playlist !== undefined) ?? [];
    return sortTrackPlaylists(playlists, user);
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