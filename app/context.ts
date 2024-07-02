import { Album, Artist, AudioFeatures, PlaybackState, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { Dispatch, SetStateAction, act, createContext } from "react";



export type SpotifyClientObject = { api: SpotifyApi, user?: UserProfile, login: () => void, logout: () => void } | null;
export const SpotifyClientContext = createContext<SpotifyClientObject>(null);

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

export const TOTAL_FETCH_STEPS = 3;
export type FetchState = { state: 'no-track' | 'track' | 'articles' | 'summary' | 'done', percent: number };
export const FetchContext = createContext<{ state: FetchState, update: Dispatch<SetStateAction<FetchState>> }>({
    state: {
        state: "no-track",
        percent: 0
    },
    update: function (value: SetStateAction<FetchState>): void {
        throw new Error("Function not implemented.");
    }
});