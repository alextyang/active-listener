import { Album, Artist, AudioFeatures, PlaybackState, Playlist, SimplifiedPlaylist, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { Dispatch, SetStateAction, act, createContext } from "react";


export type PlaylistTrackDict = { [key: string]: string[] };
export type PlaylistIDDict = { [key: string]: SimplifiedPlaylist };
export type PlaylistContextObject = { playlistTrackDict?: PlaylistTrackDict, playlistIDDict?: PlaylistIDDict };
export const PlaylistContext = createContext<PlaylistContextObject>({});


export type SpotifyClientObject = { api?: SpotifyApi, user?: UserProfile, login: () => void, logout: () => void };
export const SpotifyClientContext = createContext<SpotifyClientObject>({
    login: function (): void {
        throw new Error("Function not implemented.");
    },
    logout: function (): void {
        throw new Error("Function not implemented.");
    }
});

export type PlaybackStateObject = { playbackState?: PlaybackState, queue?: Track[] };
export const PlaybackContext = createContext<PlaybackStateObject>({});

export type ActionContextObject = { togglePlayback: (shouldPlay: boolean) => Promise<void>, setProgress: (percent: number) => void, setShouldUpdate: Dispatch<SetStateAction<boolean>>, isUpdating?: boolean };
export const ActionContext = createContext<ActionContextObject>({
    togglePlayback: function (shouldPlay: boolean): Promise<void> {
        return new Promise(() => { });
    },
    setProgress: function (percent: number): void {
    },
    setShouldUpdate: function (value: SetStateAction<boolean>): void {
    }
});

export type TrackContextObject = { track?: Track, album?: Album, artists?: Artist[], features?: AudioFeatures, siblingAlbums?: Album[], topTracks?: TopTracksResult[] } | null;
export const TrackContext = createContext<TrackContextObject>({});


export const TOTAL_TRACK_FETCH_STEPS = 3;
export type ProgressState = { state: 'no-track' | 'track' | 'articles' | 'summary' | 'done', percent: number };
export const progressMessages = { 'no-track': '', 'track': 'Getting track information...', 'articles': 'Finding reviews for track...', 'summary': 'Generating summary...', 'done': '' };
export type ProgressContextObject = { state: ProgressState, update: Dispatch<SetStateAction<ProgressState>> };
export const ProgressContext = createContext<ProgressContextObject>({
    state: {
        state: "no-track",
        percent: -1
    },
    update: function (value: SetStateAction<ProgressState>): void {
        throw new Error("Function not implemented.");
    }
});

export const TOTAL_LIBRARY_FETCH_STEPS = 2;
export type LibraryFetchState = { state: 'no-library' | 'library' | 'playlists' | 'done', percent: number };
export const LibraryFetchContext = createContext<{ state: LibraryFetchState, update: (state: LibraryFetchState) => void }>({
    update: function (value: LibraryFetchState): void {
        throw new Error("Function not implemented.");
    },
    state: {
        state: "no-library",
        percent: -1
    }
});