import { PROGRESS_INTERVAL } from "@/app/(domain)/app/config";
import { ActionContext, PlaybackContext, SpotifyClientContext } from "@/app/(domain)/app/context";
import { getProgressPercent } from "@/app/(domain)/spotify/player";
import { useCallback, useContext, useEffect, useRef, useState } from "react";


export default function Timeline() {
    const spotifyClient = useContext(SpotifyClientContext);
    const playbackContext = useContext(PlaybackContext);
    const actions = useContext(ActionContext);

    const [trackProgress, setTrackProgress] = useState<number>(getProgressPercent(playbackContext?.playbackState));
    const [manualProgress, setManualProgress] = useState<number>(0);

    const [isSmooth, setIsSmooth] = useState<boolean>(false);
    const lastTrackId = useRef<string | undefined>(undefined);

    const progressStyles = {
        transform: 'scaleX(' + (trackProgress * 100) + '%)',
        transition: isSmooth ? 'transform 1s linear' : ''
    };
    const manualProgressStyles = {
        transform: 'scaleX(' + (manualProgress * 100) + '%)'
    };

    // Update progress based on playback state
    const handleUpdateProgress = useCallback(() => {
        if (!spotifyClient.api || !playbackContext.playbackState?.item) { // No track playing
            setIsSmooth(false);
            return setTrackProgress(0);
        }
        if (!playbackContext.playbackState.is_playing) // Paused
            return setIsSmooth(false);

        const progress = getProgressPercent(playbackContext.playbackState);

        if (progress >= 1) { // Track ended
            setIsSmooth(false);
            setTrackProgress(0);
            actions.requestUpdate();
        }
        else if (lastTrackId.current !== playbackContext.playbackState.item.id) { // New track
            setIsSmooth(false);
            setTrackProgress(progress);
            lastTrackId.current = playbackContext.playbackState.item.id;
        }
        else { // Update progress
            setIsSmooth(true);
            setTrackProgress(progress);
        }
    }, [actions, playbackContext.playbackState, spotifyClient.api]);


    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setManualProgress((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width);
    }, []);

    const handleMouseClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!spotifyClient.api || !playbackContext?.playbackState?.item) return;
        setIsSmooth(false);
        actions.setProgress(manualProgress);
        setTrackProgress(manualProgress);
    }, [spotifyClient.api, playbackContext.playbackState?.item, actions, manualProgress]);


    // Update progress every second
    const progressIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);
    useEffect(() => {
        progressIntervalID.current = setInterval(handleUpdateProgress, PROGRESS_INTERVAL);
        return () => {
            clearInterval(progressIntervalID.current);
        }
    }, [handleUpdateProgress]);


    return (
        <div className='timeline' onMouseMove={handleMouseMove} onClick={handleMouseClick}>
            <div className='timelineBar' >
                <div className='timelineProgress' style={progressStyles} />
                <div className='manualProgress' style={manualProgressStyles} />
            </div>
        </div>
    )
}