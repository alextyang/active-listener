import { Album, Artist, AudioFeatures, PlaybackState, SimplifiedPlaylist, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { Dispatch, SetStateAction, createContext } from "react";
import { CompleteArticle } from "./types";


export type PlaylistDict = { tracks: { [key: string]: string[] }, playlists: { [key: string]: SimplifiedPlaylist } };
export type PlaylistContextObject = { playlistDict?: PlaylistDict };
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

export type PlaybackContextObject = { playbackState?: PlaybackState };
export const PlaybackContext = createContext<PlaybackContextObject>({});

export type QueueContextObject = { queue?: Track[] };
export const QueueContext = createContext<QueueContextObject>({});

export type ActionContextObject = { togglePlayback: () => Promise<void>, setProgress: (percent: number) => void, requestUpdate: () => void, skipToNext: () => void, skipToPrevious: () => void };
export const ActionContext = createContext<ActionContextObject>({
    setProgress: function (percent: number): void {
    },
    requestUpdate: function (): void {
    },
    togglePlayback: function (): Promise<void> {
        throw new Error("Function not implemented.");
    },
    skipToNext: function (): void {
        throw new Error("Function not implemented.");
    },
    skipToPrevious: function (): void {
        throw new Error("Function not implemented.");
    }
});

export type TrackContextObject = { track?: Track, album?: Album, artists?: Artist[], features?: AudioFeatures, siblingAlbums?: Album[], topTracks?: TopTracksResult[] } | null;
export const TrackContext = createContext<TrackContextObject>({});


export const TOTAL_PLAYBACK_FETCH_STEPS = 2;
export type PlaybackSyncState = { state: 'playback' | 'idle', percent: number };
export type PlaybackSyncContextObject = { state: PlaybackSyncState, update: Dispatch<SetStateAction<PlaybackSyncState>> };
export const PlaybackSyncContext = createContext<PlaybackSyncContextObject>({
    state: {
        state: "idle",
        percent: -1
    },
    update: function (value: SetStateAction<PlaybackSyncState>): void {
        throw new Error("Function not implemented.");
    }
});

export const TOTAL_TRACK_FETCH_STEPS = 3;
export type TrackSyncState = { state: 'track' | 'articles' | 'summary' | 'idle', percent: number };
export const trackSyncMessages = { 'track': '', 'articles': 'Finding reviews for track...', 'summary': 'Generating summary...', 'idle': '' };
export type TrackSyncContextObject = { state: TrackSyncState, update: Dispatch<SetStateAction<TrackSyncState>> };
export const TrackSyncContext = createContext<TrackSyncContextObject>({
    state: {
        state: "idle",
        percent: -1
    },
    update: function (value: SetStateAction<TrackSyncState>): void {
        throw new Error("Function not implemented.");
    }
});

export const TOTAL_LIBRARY_FETCH_STEPS = 2;
export type LibrarySyncState = { state: 'library' | 'playlists' | 'idle', percent: number };
export type LibrarySyncContextObject = { state: LibrarySyncState, requestUpdate: () => void };
export const LibrarySyncContext = createContext<LibrarySyncContextObject>({
    state: {
        state: "idle",
        percent: -1
    },
    requestUpdate: function (): void {
        throw new Error("Function not implemented.");
    }
});

export type ArticleContextObject = { articles?: CompleteArticle[] };
export const ArticleContext = createContext<ArticleContextObject>({});