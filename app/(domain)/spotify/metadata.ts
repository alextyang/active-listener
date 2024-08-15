import { Album, Artist, Page, PlaybackState, SpotifyApi, TopTracksResult, Track, UserProfile } from "@spotify/web-api-ts-sdk";
import { SetStateAction } from "react";
import { TrackSyncState, TrackContextObject } from "../app/context";
import { DEBUG_SPOTIFY_METADATA_SYNC as LOG, SIBLING_ALBUM_LIMIT, SLOW_METADATA_REQUEST_DELAY } from "../app/config";
import { getMarket } from "./profile";

export async function syncMetadata(client?: SpotifyApi, user?: UserProfile, playbackState?: PlaybackState, currentTrackID?: string, fetchState?: TrackSyncState, setCurrentTrack?: (value: SetStateAction<TrackContextObject>) => void, setFetchState?: (value: SetStateAction<TrackSyncState>) => void) {
    if (playbackState && shouldSync(playbackState, currentTrackID, fetchState))
        updateMetadata(client, user, playbackState, setCurrentTrack, setFetchState);
    else
        if (LOG) console.log('[SPOTIFY-METADATA] Track already loaded or loading:', playbackState);
}

async function updateMetadata(client?: SpotifyApi, user?: UserProfile, playbackState?: PlaybackState, setCurrentTrack?: (value: SetStateAction<TrackContextObject>) => void, setFetchState?: (value: SetStateAction<TrackSyncState>) => void) {
    if (!client || !playbackState || !setCurrentTrack) return;

    if (setFetchState) setFetchState({ state: 'track', percent: -1 });

    const track = playbackState.item as Track;
    setCurrentTrack({ track: track });
    if (LOG) console.log('[SPOTIFY-METADATA] Found track:', track);

    const artists = await fetchArtists(client, track);
    setCurrentTrack({ track: track, artists: artists });

    const album = await fetchAlbum(client, track);
    setCurrentTrack({ track: track, artists: artists, album: album });

    const topTracks = await fetchArtistsTopTracks(client, artists, user);
    setCurrentTrack({ track: track, artists: artists, album: album, topTracks: topTracks });

    const siblingAlbums = await fetchArtistsAlbums(client, artists, album);
    setCurrentTrack({ track: track, artists: artists, album: album, siblingAlbums: siblingAlbums });
}

function shouldSync(playbackState?: PlaybackState, currentTrackID?: string, fetchState?: TrackSyncState): boolean {
    if (LOG) console.log('[SPOTIFY-METADATA] Should sync? \n\tIs new: ' + isNewTrack(currentTrackID, playbackState) + '\n\tNot already syncing: ' + (fetchState?.state !== 'track'));
    return isNewTrack(currentTrackID, playbackState) && fetchState?.state !== 'track';
}


export function isNewTrack(trackID?: string, playbackState?: PlaybackState): boolean {
    if (!playbackState?.item) return false;
    return trackID !== playbackState?.item.id;
}

export async function fetchArtists(client: SpotifyApi, track: Track): Promise<Artist[]> {
    const artists = await client.artists.get(track.artists.map((artist) => artist.id));
    if (LOG) console.log('[SPOTIFY-METADATA] Found \'' + track.name + '\' artists:', artists);
    return artists;
}

export async function fetchAlbum(client: SpotifyApi, track: Track): Promise<Album> {
    const album = await client.albums.get(track.album.id);
    if (LOG) console.log('[SPOTIFY-METADATA] Found \'' + track.name + '\' album:', album);
    return album;
}

export async function fetchArtistTopTracks(client: SpotifyApi, artist: Artist, user?: UserProfile): Promise<TopTracksResult> {
    const topTracks = await client.artists.topTracks(artist.id, getMarket(user));
    if (LOG) console.log('[SPOTIFY-METADATA] Found \'' + artist.name + '\' top tracks:', topTracks);
    return topTracks;
}

export async function fetchArtistsTopTracks(client: SpotifyApi, artists: Artist[], user?: UserProfile): Promise<TopTracksResult[]> {
    const topTracks = await resolveSlowly(artists.map((artist) => fetchArtistTopTracks(client, artist, user))) as TopTracksResult[];
    return topTracks;
}

export async function fetchArtistAlbums(client: SpotifyApi, artist: Artist, excludeAlbum?: Album): Promise<Album[]> {
    const simplifiedAlbums = (await client.artists.albums(artist.id, 'album', undefined, SIBLING_ALBUM_LIMIT)).items;
    const albumIDs = simplifiedAlbums.map((album) => album.id);

    while (excludeAlbum && albumIDs.includes(excludeAlbum.id))
        albumIDs.splice(albumIDs.indexOf(excludeAlbum.id), 1);

    const albums: Album[] = [];
    while (albumIDs.length > 0) {
        albums.push(...(await client.albums.get(albumIDs.splice(0, 20))));
        await wait(SLOW_METADATA_REQUEST_DELAY);
    }

    if (LOG) console.log('[SPOTIFY-METADATA] Found albums for \'' + artist.name + '\':', albums);
    return albums;
}

export async function fetchArtistsAlbums(client: SpotifyApi, artists: Artist[], excludeAlbum?: Album): Promise<Album[]> {
    const albums = (await resolveSlowly(artists.map((artist) => fetchArtistAlbums(client, artist, excludeAlbum))) as Album[][]).flat();
    return albums;
}



const wait = (m: number) => new Promise(r => setTimeout(r, m))
const resolveSlowly = async (promises: (Promise<any> | undefined)[]) => {
    const results = [];
    for (const promise of promises) {
        results.push(await promise);
        await wait(SLOW_METADATA_REQUEST_DELAY);
    }
    return results;
};