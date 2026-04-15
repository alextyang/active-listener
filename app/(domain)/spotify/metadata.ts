import { TrackItem } from "@spotify/web-api-ts-sdk";
import { TrackContextObject } from "../app/context";
import { DEFAULT_TRACK_GRADIENT, TRACK_GRADIENT_ANGLE } from "../app/config";
import { createGradientStyleString, rgbaToStyleString } from "../utilities/colors";
import { toTitleCase } from "../utilities/text";

export function trackItemsToTracks(items: TrackItem[]) {
    return items.map((item) => trackItemToTrack(item)).filter((item) => item !== undefined);
}

export function trackItemToTrack(item: TrackItem) {
    try {
        return 'track' in item ? item.track : item;
    } catch (error) {
        return undefined;
    }
}

export function getPlayerGradient(track?: TrackContextObject): string {
    if (!track?.palette) return DEFAULT_TRACK_GRADIENT;

    const color1 = track.palette.Muted?.rgb;
    if (!color1) return DEFAULT_TRACK_GRADIENT;

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
