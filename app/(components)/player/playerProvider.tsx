"use client";

import { SpotifyClientContext, TrackSyncState, TrackContextObject, ActionContext, PlaybackContext, TrackSyncContext, TrackContext, PlaybackSyncState, PlaybackSyncContext, ContextClueObject, ContextClueContext } from "@/app/(domain)/app/context";
import { extractMetadataContextClues } from "@/app/(domain)/spotify/clues";
import { shouldSync, syncMetadata } from "@/app/(domain)/spotify/metadata";
import { getPlaybackState, togglePlayback, skipToNext, skipToPrevious, setProgress, scheduleRegularUpdate, scheduleTrackEndUpdate } from "@/app/(domain)/spotify/player";
import { PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { useContext, useState, useRef, useCallback, useEffect } from "react";



export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);

    const [playbackSyncState, setPlaybackSyncState] = useState<PlaybackSyncState>({ state: 'waiting' });
    const [trackSyncState, setTrackSyncState] = useState<TrackSyncState>({ state: 'waiting' });

    const trackTimeoutID = useRef<NodeJS.Timeout | undefined>(undefined);
    const trackUpdateIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);

    const [playbackState, setPlaybackState] = useState<PlaybackState | undefined>(undefined);
    const [queue, setQueue] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<TrackContextObject>({});
    const [contextClues, setContextClues] = useState<ContextClueObject>({});

    const currentTrackID = useRef<string | undefined>(undefined);

    const handleMetadataUpdate = useCallback((value: TrackContextObject): boolean => {
        // if (value?.track?.id !== currentTrackID.current) {
        //     console.log('[SPOTIFY-METADATA] Track changed, aborting metadata sync for ' + value?.track?.id + '===' + currentTrackID.current);
        //     return false;
        // }
        setCurrentTrack(value);
        setContextClues(extractMetadataContextClues(value));
        return true;
    }, []);

    const handlePlaybackSync = useCallback(async () => {
        // if (document.hidden) return;
        const newState = await getPlaybackState(spotifyClient.api, setPlaybackSyncState);
        setPlaybackState(newState);

        if (newState && shouldSync(newState, currentTrackID.current, trackSyncState)) {
            currentTrackID.current = playbackState?.item.id;
            await syncMetadata(spotifyClient.api, spotifyClient.user, newState, trackSyncState, handleMetadataUpdate, setTrackSyncState);
        }
        else
            console.log('[SPOTIFY-METADATA] Track already loaded or loading: old(' + currentTrackID.current + ') new(' + newState?.item.id + ') ...' + trackSyncState.state);


    }, [spotifyClient.api, spotifyClient.user, trackSyncState, playbackState?.item.id, handleMetadataUpdate]);


    const handleTogglePlayback = useCallback(async () => {
        await togglePlayback(spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    const handleSkipToNext = useCallback(async () => {
        setCurrentTrack({});
        await skipToNext(spotifyClient.api, playbackState, handlePlaybackSync, setPlaybackState);
    }, [handlePlaybackSync, playbackState, spotifyClient.api]);

    const handleSkipToPrevious = useCallback(async () => {
        setCurrentTrack({});
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
        trackTimeoutID.current = scheduleTrackEndUpdate(spotifyClient.api, playbackState, setPlaybackState, setCurrentTrack, setPlaybackSyncState);
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
                            <ContextClueContext.Provider value={contextClues}>
                                {children}
                            </ContextClueContext.Provider>
                        </TrackSyncContext.Provider>
                    </PlaybackSyncContext.Provider>
                </ActionContext.Provider>
            </TrackContext.Provider>
        </PlaybackContext.Provider>
    )
}