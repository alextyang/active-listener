import { Album, Artist, AudioFeatures, PlaybackState, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import { createContext } from "react";


export const SpotifyClientContext = createContext<SpotifyApi | null>(null);
export const PlaybackContext = createContext<{ playbackState: PlaybackState } | null>(null);
export const TrackContext = createContext<{ track: Track } | null>(null);
export const TrackDetailsContext = createContext<{ album: Album, artists: Artist[], features: AudioFeatures } | null>(null);