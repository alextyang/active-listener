"use server";

import { TrackContextObject } from "@/app/(domain)/app/context";
import { Album, Market, Page, SpotifyApi, TopTracksResult, Track } from "@spotify/web-api-ts-sdk";

export async function searchSongs(query: string): Promise<Track[]> {

    const serverClient = SpotifyApi.withClientCredentials(process.env.SPOTIFY_CLIENT_ID ?? '', process.env.SPOTIFY_CLIENT_SECRET ?? '');

    const results = await serverClient.search(query, ['track'], 'US', 8);

    // console.log('[DEMO-SEARCH] Searching for ' + query + ': ' + results.tracks.items.length + ' results found.');
    return results.tracks.items;
}

const MAX_ALBUMS = 20;
export async function fetchTrackContext(id: string): Promise<TrackContextObject | undefined> {

    const spotifyClient = SpotifyApi.withClientCredentials(process.env.SPOTIFY_CLIENT_ID ?? '', process.env.SPOTIFY_CLIENT_SECRET ?? '');

    if (!spotifyClient) return;


    const track = await spotifyClient.tracks.get(id);

    const artists = await spotifyClient.artists.get(track.artists.map((artist) => artist.id));

    const album = await spotifyClient.albums.get(track.album.id);

    const topTracks = await resolveDelayedPromises(artists.map((artist) => spotifyClient.artists.topTracks(artist.id, "US" as Market))) as TopTracksResult[];

    const [...siblingSimplifiedAlbumsArray] = await resolveDelayedPromises(artists.map((artist) => spotifyClient.artists.albums(artist.id, 'album', undefined, MAX_ALBUMS))) as Page<Album>[];

    const albumIDs = siblingSimplifiedAlbumsArray.map((albums) => albums.items.map((album) => album.id)).flat();

    // Divide albumIDs into chunks of 20
    const [...albumIDsChunks] = albumIDs.reduce<string[][]>((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / 20)

        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [] as string[] // start a new chunk
        }

        resultArray[chunkIndex].push(item)

        return resultArray
    }, []);

    const [...siblingAlbums] = (await resolveDelayedPromises(albumIDsChunks.map((albumIDs) => spotifyClient.albums.get(albumIDs))) as Album[][]).flat();

    return ({ track: track, artists: artists, album: album, topTracks: topTracks, siblingAlbums: siblingAlbums });

}

const REQUEST_DELAY = 1 * 100;
const resolveDelayedPromises = async (promises: (Promise<any>)[]) => {
    const results = [];
    for (const promise of promises) {
        results.push(await promise);
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
    return results;
};