import { PlaybackContext, SpotifyClientContext } from "@/app/context";
import { useContext, useEffect, useRef, useState } from "react";

const PROGRESS_INTERVAL = 300;


export default function Timeline() {
    const spotifyClient = useContext(SpotifyClientContext);
    const currentTrack = useContext(PlaybackContext);

    const roundTime = (time: number) => {
        return Math.ceil(time / PROGRESS_INTERVAL) * PROGRESS_INTERVAL;
    }

    const [trackProgress, setTrackProgress] = useState(currentTrack ? (roundTime(currentTrack.playbackState.progress_ms)) : 0);
    const progressIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        setTrackProgress(currentTrack ? roundTime(currentTrack.playbackState.progress_ms) : 0);
    }, [currentTrack]);

    useEffect(() => {
        clearInterval(progressIntervalID.current);
        progressIntervalID.current = setInterval(() => {
            if (currentTrack && currentTrack.playbackState.is_playing) {
                setTrackProgress(trackProgress + PROGRESS_INTERVAL);
                // console.log('[PLAY] Confirmed time ' + trackProgress);
            }
        }, PROGRESS_INTERVAL);
    });

    return (
        <div className='timeline'>
            <div className='timelineBar'>
                <div className='timelineProgress' style={{ width: (trackProgress / roundTime(currentTrack?.playbackState.item.duration_ms ?? 1) * 100) + '%' }} />
            </div>

        </div>
    )
}