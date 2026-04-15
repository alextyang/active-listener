"use client";

import { ActionContext, PlaybackContext, PlaybackSyncContext, PlaybackSyncState, SpotifyClientContext } from "@/app/(domain)/app/context";
import { CONTROL_RESYNC_LATENCY, TRACK_AUTO_POLL_INTERVAL } from "@/app/(domain)/app/config";
import { getPlaybackState, setProgress, skipToNext, skipToPrevious, togglePlayback } from "@/app/(domain)/spotify/player";
import { PlaybackState } from "@spotify/web-api-ts-sdk";
import { useCallback, useContext, useEffect, useState } from "react";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);

    const [playbackState, setPlaybackState] = useState<PlaybackState | undefined>(undefined);
    const [playbackSyncState, setPlaybackSyncState] = useState<PlaybackSyncState>({ state: "waiting" });

    const handlePlaybackSync = useCallback(async () => {
        const nextState = await getPlaybackState(spotifyClient.api, setPlaybackSyncState);
        setPlaybackState(nextState);
    }, [spotifyClient.api]);

    useEffect(() => {
        void handlePlaybackSync();
    }, [handlePlaybackSync]);

    useEffect(() => {
        if (!spotifyClient.api) return;

        const intervalId = setInterval(() => {
            void handlePlaybackSync();
        }, TRACK_AUTO_POLL_INTERVAL);

        return () => clearInterval(intervalId);
    }, [handlePlaybackSync, spotifyClient.api]);

    useEffect(() => {
        const onFocus = () => {
            void handlePlaybackSync();
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [handlePlaybackSync]);

    const requestUpdate = useCallback(() => {
        setPlaybackSyncState({ state: "playback" });
        setTimeout(() => {
            void handlePlaybackSync();
        }, CONTROL_RESYNC_LATENCY);
    }, [handlePlaybackSync]);

    const handleTogglePlayback = useCallback(async () => {
        await togglePlayback(spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    const handleSkipToNext = useCallback(async () => {
        await skipToNext(spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    const handleSkipToPrevious = useCallback(async () => {
        await skipToPrevious(spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    const handleSetProgress = useCallback(async (percent: number) => {
        await setProgress(percent, spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    return (
        <PlaybackContext.Provider value={{ playbackState }}>
            <ActionContext.Provider value={{
                togglePlayback: handleTogglePlayback,
                skipToNext: handleSkipToNext,
                skipToPrevious: handleSkipToPrevious,
                setProgress: handleSetProgress,
                requestUpdate,
            }}>
                <PlaybackSyncContext.Provider value={{ state: playbackSyncState, update: setPlaybackSyncState }}>
                    {children}
                </PlaybackSyncContext.Provider>
            </ActionContext.Provider>
        </PlaybackContext.Provider>
    );
}
