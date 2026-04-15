import { Album, Artist, Market, SpotifyApi, TopTracksResult, Track } from "@spotify/web-api-ts-sdk";
import { DEFAULT_MARKET, SIBLING_ALBUM_LIMIT } from "../app/config";
import { TrackMetadataRecord } from "../app/types";
import { extractPaletteFromImage } from "../utilities/palette";
import { getServerEnv } from "./env";

let spotifyClient: SpotifyApi | undefined;

function getSpotifyServerClient(): SpotifyApi {
    if (spotifyClient) return spotifyClient;

    const env = getServerEnv();
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET)
        throw new Error("Spotify server credentials are not configured.");

    spotifyClient = SpotifyApi.withClientCredentials(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
    return spotifyClient;
}

export async function searchTracks(query: string): Promise<Track[]> {
    const client = getSpotifyServerClient();
    const results = await client.search(query, ["track"], DEFAULT_MARKET, 8);
    return results.tracks.items;
}

export async function fetchTrackMetadata(trackId: string): Promise<TrackMetadataRecord> {
    const client = getSpotifyServerClient();
    const track = await client.tracks.get(trackId);
    const artists = await client.artists.get(track.artists.map((artist) => artist.id)) as unknown as Artist[];
    const album = await client.albums.get(track.album.id) as unknown as Album;
    const topTracks = await Promise.all(artists.map((artist) => client.artists.topTracks(artist.id, DEFAULT_MARKET as Market))) as unknown as TopTracksResult[];
    const siblingAlbums = await fetchArtistsAlbums(client, artists, album) as unknown as Album[];
    const palette = await extractPaletteFromImage(track.album.images[0]?.url);

    return {
        track,
        artists,
        album,
        topTracks,
        siblingAlbums,
        palette,
    };
}

async function fetchArtistsAlbums(client: SpotifyApi, artists: Artist[], excludeAlbum?: Album): Promise<Album[]> {
    const pages = await Promise.all(artists.map((artist) => client.artists.albums(artist.id, "album", undefined, SIBLING_ALBUM_LIMIT)));
    const albumIds = Array.from(new Set(pages.flatMap((page) => page.items.map((album) => album.id)).filter((albumId) => albumId !== excludeAlbum?.id)));

    const albums: Album[] = [];
    while (albumIds.length > 0) {
        albums.push(...await client.albums.get(albumIds.splice(0, 20)));
    }

    return albums;
}
