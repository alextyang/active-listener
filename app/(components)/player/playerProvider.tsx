"use client";

import { SpotifyClientContext, TrackSyncState, TrackContextObject, ActionContext, PlaybackContext, TrackSyncContext, TrackContext, PlaybackSyncState, PlaybackSyncContext } from "@/app/(domain)/app/context";
import { syncMetadata } from "@/app/(domain)/spotify/metadata";
import { getPlaybackState, togglePlayback, skipToNext, skipToPrevious, setProgress, scheduleRegularUpdate, scheduleTrackEndUpdate } from "@/app/(domain)/spotify/player";
import { PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { useContext, useState, useRef, useCallback, useEffect } from "react";



export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);

    const [playbackSyncState, setPlaybackSyncState] = useState<PlaybackSyncState>({ state: 'idle', percent: -1 });
    const [trackSyncState, setTrackSyncState] = useState<TrackSyncState>({ state: 'idle', percent: -1 });

    const trackTimeoutID = useRef<NodeJS.Timeout | undefined>(undefined);
    const trackUpdateIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);

    const [playbackState, setPlaybackState] = useState<PlaybackState | undefined>(undefined);
    const [queue, setQueue] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<TrackContextObject>({});
    const currentTrackID = useRef<string | undefined>(undefined);

    const handlePlaybackSync = useCallback(async () => {
        // if (document.hidden) return;

        const newState = await getPlaybackState(spotifyClient.api, setPlaybackSyncState);

        setPlaybackState(newState);
        await syncMetadata(spotifyClient.api, spotifyClient.user, newState, currentTrackID.current, trackSyncState, setCurrentTrack, setTrackSyncState);

        currentTrackID.current = playbackState?.item.id;

    }, [trackSyncState, playbackState, spotifyClient.api, spotifyClient.user]);


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


    useEffect(() => {
        clearInterval(trackUpdateIntervalID.current);
        trackUpdateIntervalID.current = scheduleRegularUpdate(spotifyClient.api, setPlaybackState, setPlaybackSyncState);
    }, [playbackState, spotifyClient.api]);

    useEffect(() => {
        clearTimeout(trackTimeoutID.current);
        trackTimeoutID.current = scheduleTrackEndUpdate(spotifyClient.api, playbackState, setPlaybackState, setPlaybackSyncState);
    }, [playbackState, spotifyClient.api]);

    const handleVisibilityChange = useCallback(() => {
        if (!currentTrack?.track)
            handlePlaybackSync();
    }, [currentTrack?.track, handlePlaybackSync]);


    // Sync on page refocus
    useEffect(() => {
        window.addEventListener('focus', handleVisibilityChange);
        return () => {
            window.removeEventListener('focus', handleVisibilityChange);
        }
    }, [handleVisibilityChange]);

    // Sync on page load
    useEffect(() => {
        handlePlaybackSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spotifyClient]);


    return (
        <PlaybackContext.Provider value={{ playbackState: playbackState }}>
            <TrackContext.Provider value={currentTrack}>
                <ActionContext.Provider value={{ togglePlayback: handleTogglePlayback, skipToNext: handleSkipToNext, skipToPrevious: handleSkipToPrevious, setProgress: handleSetProgress, requestUpdate: handlePlaybackSync }}>
                    <PlaybackSyncContext.Provider value={{ update: setPlaybackSyncState, state: playbackSyncState }}>
                        <TrackSyncContext.Provider value={{ update: setTrackSyncState, state: trackSyncState }}>
                            {children}
                        </TrackSyncContext.Provider>
                    </PlaybackSyncContext.Provider>
                </ActionContext.Provider>
            </TrackContext.Provider>
        </PlaybackContext.Provider>
    )
}