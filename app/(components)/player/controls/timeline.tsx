import { ActionContext, PlaybackContext, SpotifyClientContext } from "@/app/(domain)/app/context";
import { useContext, useEffect, useRef, useState } from "react";

const PROGRESS_INTERVAL = 300;


export default function Timeline() {
    const spotifyClient = useContext(SpotifyClientContext);
    const playbackContext = useContext(PlaybackContext);
    const actions = useContext(ActionContext);

    const roundTime = (time: number) => {
        return Math.ceil(time / PROGRESS_INTERVAL) * PROGRESS_INTERVAL;
    }

    const [trackProgress, setTrackProgress] = useState(playbackContext?.playbackState ? (roundTime(playbackContext.playbackState.progress_ms)) : 0);
    const [manualProgress, setManualProgress] = useState(0);
    const progressIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);

    // Sync progress with fetched playback state
    useEffect(() => {
        setTrackProgress(roundTime(playbackContext?.playbackState?.progress_ms ?? 0));
    }, [playbackContext?.playbackState?.progress_ms]);

    // Extrapolate progress at interval
    useEffect(() => {
        clearInterval(progressIntervalID.current);
        progressIntervalID.current = setInterval(() => {
            if (playbackContext?.playbackState && playbackContext.playbackState.is_playing) {
                setTrackProgress(trackProgress + PROGRESS_INTERVAL);
                if (trackProgress + PROGRESS_INTERVAL >= playbackContext.playbackState.item.duration_ms) {
                    setTrackProgress(0);
                    actions.requestUpdate();
                }
            }
        }, PROGRESS_INTERVAL);
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        setManualProgress((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width);
    }

    const handleMouseClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!spotifyClient.api || !playbackContext?.playbackState) return;

        const duration = playbackContext.playbackState.item.duration_ms;
        const newProgress = Math.round(manualProgress * duration);

        spotifyClient.api.player.seekToPosition(newProgress);
        setTrackProgress(roundTime(newProgress));
    }

    return (
        <div className='timeline' onMouseMove={handleMouseMove} onClick={handleMouseClick}>
            <div className='timelineBar' >
                <div className='timelineProgress' style={{ width: (trackProgress / roundTime(playbackContext?.playbackState?.item.duration_ms ?? 1) * 100) + '%' }} />
                <div className='manualProgress' style={{ width: (manualProgress * 100) + '%' }} />
            </div>

        </div>
    )
}