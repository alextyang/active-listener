import React, { useContext, useState } from 'react';
import { PlaybackContext, SpotifyClientContext } from '@/app/context';

export default function Controls() {
    const client = useContext(SpotifyClientContext);
    const playback = useContext(PlaybackContext);

    const [isPlaying, setIsPlaying] = useState(true);
    const [isDisabled, setIsDisabled] = useState(false);

    if (!client) return null;


    const skipToPrevious = () => {
        if (isDisabled) return;
        setIsPlaying(true);
        client.player.skipToPrevious('');

        setIsDisabled(true);
        setTimeout(() => { setIsDisabled(false); }, 300);
    };

    const skipToNext = () => {
        if (isDisabled) return;
        setIsPlaying(true);
        client.player.skipToNext('');

        setIsDisabled(true);
        setTimeout(() => { setIsDisabled(false); }, 300);
    };

    const togglePlay = () => {
        if (playback && playback.playbackState.is_playing) {
            setIsPlaying(false);
            client.player.pausePlayback('');
        } else {
            setIsPlaying(true);
            client.player.startResumePlayback('');
        }
    };



    return (
        <div className='controls'>
            <div onClick={skipToPrevious} className='controlButton'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M220-240v-480h80v480h-80Zm520 0L380-480l360-240v480Z" /></svg>
            </div>
            <div onClick={togglePlay} className='controlButton playButton'>
                {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M320-200v-560l440 280-440 280Z" /></svg>}
            </div>
            <div onClick={skipToNext} className='controlButton'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Z" /></svg>
            </div>
        </div>
    );
};