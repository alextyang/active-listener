import { CLUE_TYPE_ALBUM, CLUE_TYPE_ARTIST, CLUE_TYPE_TRACK, DEBUG_CLUES } from "../app/config";
import { TrackContextObject, ContextClueObject } from "../app/context";
import { isTrackSingle, isSelfTitled } from "../music/metadata";

export function extractMetadataContextClues(track: TrackContextObject): ContextClueObject {
    if (!track?.track) return {};

    const clues: ContextClueObject = {};

    extractCurrentTrackClue(clues, track);
    extractArtistClues(clues, track);
    extractAlbumClue(clues, track);
    extractSiblingAlbumClues(clues, track);
    extractSiblingTrackClues(clues, track);

    if (DEBUG_CLUES) console.log('[CLUES] Extracted clues:', clues);

    return clues;
}

function extractCurrentTrackClue(clues: ContextClueObject, track: TrackContextObject) {
    addClue(clues, track?.track?.name, CLUE_TYPE_TRACK, track?.track);
}

function extractArtistClues(clues: ContextClueObject, track: TrackContextObject) {
    if (!track?.artists) return;
    track.artists.forEach((artist) => {
        addClue(clues, artist.name, CLUE_TYPE_ARTIST, artist);
    });
}

function extractAlbumClue(clues: ContextClueObject, track: TrackContextObject) {
    if (!track?.album || !track?.track || !isTrackSingle(track?.track?.name, track?.album?.name)) return;
    addClue(clues, track?.album?.name, CLUE_TYPE_ALBUM, track?.album);
}

function extractSiblingAlbumClues(clues: ContextClueObject, track: TrackContextObject) {
    if (!track?.siblingAlbums) return;
    track.siblingAlbums.forEach((album) => {
        if (!isSelfTitled(album.name, track.artists?.map((artist) => artist.name) || []))
            addClue(clues, album.name, CLUE_TYPE_ALBUM, album);
    });
}

function extractSiblingTrackClues(clues: ContextClueObject, track: TrackContextObject) {
    if (!track?.topTracks) return;
    track.topTracks.forEach((siblingTracks) => {
        siblingTracks.tracks.forEach((siblingTrack) => {
            if (!isSelfTitled(siblingTrack.name, track.artists?.map((artist) => artist.name) || []))
                addClue(clues, siblingTrack.name, CLUE_TYPE_TRACK, siblingTrack);
        });
    });
}

function addClue(clues: ContextClueObject, key?: string, type?: string, value?: any) {
    if (!value || !type || !key || clues[key]) return;
    clues[key] = { type, value };
}