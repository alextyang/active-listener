import { Album, Artist, Page, PlaybackState, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { SetStateAction } from "react";
import { TrackSyncState, TrackContextObject } from "../app/context";
import { CACHE_METADATA_KEY, DEFAULT_TRACK_GRADIENT, DEBUG_SPOTIFY_METADATA_SYNC as LOG, SIBLING_ALBUM_LIMIT, SLOW_METADATA_REQUEST_DELAY, TRACK_GRADIENT_ANGLE } from "../app/config";
import { getMarket } from "./profile";
import { loadTrackProperty, savePropertyToTrack } from "../site/cache";
import { createGradientStyleString, extractPaletteFromImage, rgbaToStyleString } from "../utilities/colors";
import { resolveSlowly, wait } from "../utilities/fetch";
import { toTitleCase } from "../utilities/text";

// FETCH
export async function syncMetadata(client?: SpotifyApi, user?: UserProfile, playbackState?: PlaybackState, fetchState?: TrackSyncState, setCurrentTrack?: (value: TrackContextObject) => boolean, setFetchState?: (value: SetStateAction<TrackSyncState>) => void) {
    updateMetadata(client, user, playbackState, setCurrentTrack, setFetchState);
}

async function updateMetadata(client?: SpotifyApi, user?: UserProfile, playbackState?: PlaybackState, setCurrentTrack?: (value: TrackContextObject) => boolean, setFetchState?: (value: SetStateAction<TrackSyncState>) => void) {
    if (!client || !playbackState || !setCurrentTrack) return;

    if (setFetchState) setFetchState({ state: 'track' });

    const cachedMetadata = await loadTrackProperty<TrackContextObject>(playbackState.item.id, CACHE_METADATA_KEY);
    if (cachedMetadata) {
        if (LOG) console.log('[SPOTIFY-METADATA] Found cached metadata for track:', cachedMetadata);
        return setCurrentTrack(cachedMetadata);
    }

    const track = playbackState.item as Track;
    setCurrentTrack({ track: track });
    if (LOG) console.log('[SPOTIFY-METADATA] Found track:', track);

    const palette = await extractPaletteFromImage(track.album.images[0].url);
    if (!setCurrentTrack({ track: track, palette: palette })) return;

    const artists = await fetchArtists(client, track);
    if (!setCurrentTrack({ track: track, artists: artists, palette: palette })) return;

    const album = await fetchAlbum(client, track);
    if (!setCurrentTrack({ track: track, artists: artists, album: album, palette: palette })) return;

    const topTracks = await fetchArtistsTopTracks(client, artists, user);
    if (!setCurrentTrack({ track: track, artists: artists, album: album, topTracks: topTracks, palette: palette })) return;

    const siblingAlbums = await fetchArtistsAlbums(client, artists, album);
    if (!setCurrentTrack({ track: track, artists: artists, album: album, siblingAlbums: siblingAlbums, palette: palette })) return;

    savePropertyToTrack<TrackContextObject>(track.id, CACHE_METADATA_KEY, { track: track, artists: artists, album: album, siblingAlbums: siblingAlbums, topTracks: topTracks, palette: palette });
}

export function shouldSync(playbackState?: PlaybackState, currentTrackID?: string, fetchState?: TrackSyncState): boolean {
    if (LOG) console.log('[SPOTIFY-METADATA] Should sync? \n\tIs new: ' + isNewTrack(currentTrackID, playbackState));
    return isNewTrack(currentTrackID, playbackState);
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
    const topTracks = await makeMetadataRequests(artists.map((artist) => fetchArtistTopTracks(client, artist, user))) as TopTracksResult[];
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
    const albums = (await makeMetadataRequests(artists.map((artist) => fetchArtistAlbums(client, artist, excludeAlbum))) as Album[][]).flat();
    return albums;
}

const makeMetadataRequests = async (requests: Promise<any>[]): Promise<any[]> => {
    return resolveSlowly(SLOW_METADATA_REQUEST_DELAY, requests);
}


// Type conversion
export function trackItemsToTracks(items: TrackItem[]): Track[] {
    return items.map((item) => trackItemToTrack(item)).filter((item) => item !== undefined) as Track[];
}

export function trackItemToTrack(item: TrackItem): Track | undefined {
    try {
        return item as Track;
    } catch (error) {
        return undefined;
    }
}


// Rendering
export function getPlayerGradient(track?: TrackContextObject): string {
    if (!track || !track.palette) return DEFAULT_TRACK_GRADIENT;

    const color1 = track.palette.Muted?.rgb.flat();
    const color2 = track.palette.Vibrant?.rgb.flat();
    if (!color1 || !color2) return DEFAULT_TRACK_GRADIENT;

    return createGradientStyleString(
        rgbaToStyleString([...color1, 1]),
        rgbaToStyleString([...color1, 1]),
        TRACK_GRADIENT_ANGLE, 0, 100);
}

export function getTrackGenres(track?: TrackContextObject): string[] {
    if (!track || !track.artists) return [];

    const albumGenres = track.album?.genres ?? [];
    const artistGenres = track.artists.map((artist) => artist.genres).flat();

    const genres = Array.from(new Set(albumGenres.concat(artistGenres)));
    return genres.map((genre) => toTitleCase(genre));
}

export function getGenreLink(genre: string): string {
    return 'spotify:search:genre:"' + genre.toLowerCase() + '"';
}