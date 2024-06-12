import { Album, Artist, PlaybackState, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import { createContext } from "react";


export const SpotifyClientContext = createContext<SpotifyApi | null>(null);
export const CurrentPlaybackContext = createContext<{ playbackState: PlaybackState } | null>(null);
export const CurrentTrackInfoContext = createContext<{ track: Track, album: Album, artists: Artist[] } | null>(null);