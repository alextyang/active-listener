import { Album, Artist, AudioFeatures, Context, PlaybackState, SimplifiedPlaylist, SimplifiedTrack, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { SetStateAction, createContext } from "react";
import { CompleteArticle } from "./types";
import { Palette } from "node-vibrant/lib/color";


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


// export type QueueContextObject = { dynamicQueue: SimplifiedTrack[], staticQueue?: SimplifiedTrack[], history?: Track[], overlayWidth: number, isOverlayOpen: boolean, canUndo: boolean, canRedo: boolean, actions?: { move: (trackIndices: number[], position: number) => void, add: (track: Track[]) => void, remove: (trackIndices: number[]) => void, playNow: (trackIndex: number) => void, skipTo: (trackIndex: number) => void, undo: () => void, redo: () => void } };
// export const DEFAULT_QUEUE_CONTEXT: QueueContextObject = { dynamicQueue: [], overlayWidth: QUEUE_OVERLAY_DEFAULT_SIZE, isOverlayOpen: false, canUndo: false, canRedo: false };
export type QueueContextObject = { queue?: SimplifiedTrack[], history: SimplifiedTrack[] };
export const DEFAULT_QUEUE_CONTEXT: QueueContextObject = { queue: [], history: [] };
export const QueueContext = createContext<QueueContextObject>(DEFAULT_QUEUE_CONTEXT);


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

export type TrackContextObject = { track?: Track, album?: Album, artists?: Artist[], features?: AudioFeatures, siblingAlbums?: Album[], topTracks?: TopTracksResult[], palette?: Palette } | null;
export const TrackContext = createContext<TrackContextObject>({});

export type ContextClueObject = { [key: string]: { type: string, value: any } };
export const ContextClueContext = createContext<ContextClueObject>({});


export const TOTAL_PLAYBACK_FETCH_STEPS = 2;
export type PlaybackSyncState = { state: 'playback' | 'waiting', percent?: number };
export type PlaybackSyncContextObject = { state: PlaybackSyncState, update: (value: PlaybackSyncState) => void };
export const PlaybackSyncContext = createContext<PlaybackSyncContextObject>({
    state: {
        state: "waiting"
    },
    update: function (value: SetStateAction<PlaybackSyncState>): void {
        throw new Error("Function not implemented.");
    }
});

export const TOTAL_TRACK_FETCH_STEPS = 3;
export type TrackSyncState = { state: 'track' | 'articles' | 'summary' | 'waiting', percent?: number };
export const trackSyncMessages = { 'track': '', 'articles': 'Finding reviews for track...', 'summary': 'Generating summary...', 'waiting': '' };
export type TrackSyncContextObject = { state: TrackSyncState, update: (value: TrackSyncState) => void };
export const TrackSyncContext = createContext<TrackSyncContextObject>({
    state: {
        state: "waiting"
    },
    update: function (value: SetStateAction<TrackSyncState>): void {
        throw new Error("Function not implemented.");
    }
});

export const TOTAL_LIBRARY_FETCH_STEPS = 2;
export type LibrarySyncState = { state: 'library' | 'playlists' | 'waiting', percent?: number };
export type LibrarySyncContextObject = { state: LibrarySyncState, requestUpdate: () => void };
export const LibrarySyncContext = createContext<LibrarySyncContextObject>({
    state: {
        state: "waiting"
    },
    requestUpdate: function (): void {
        throw new Error("Function not implemented.");
    }
});

export type ArticleContextObject = { articles?: CompleteArticle[] };
export const ArticleContext = createContext<ArticleContextObject>({});

export type SummaryContextObject = { summary?: React.ReactNode[] };
export const SummaryContext = createContext<SummaryContextObject>({});