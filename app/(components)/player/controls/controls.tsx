import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActionContext, PlaybackContext, SpotifyClientContext } from '@/app/(domain)/app/context';
import { Devices } from '@spotify/web-api-ts-sdk';
import { shouldDisplayPlaying } from '@/app/(domain)/spotify/player';

const DISABLED_TIMEOUT = 100;

export default function Controls() {
    const client = useContext(SpotifyClientContext);
    const playback = useContext(PlaybackContext);
    const actions = useContext(ActionContext);

    const [isPlaying, setIsPlaying] = useState(playback?.playbackState?.is_playing ?? false);
    const [isDisabled, setIsDisabled] = useState(false);

    useEffect(() => {
        setIsPlaying(shouldDisplayPlaying(playback?.playbackState));
    }, [playback?.playbackState]);

    const handleControlAction = useCallback((callback: () => void) => {
        if (isDisabled) return;
        callback();
        setIsDisabled(true);
        setTimeout(() => { setIsDisabled(false); }, DISABLED_TIMEOUT);
    }, [isDisabled]);

    const handleTogglePlayback = useCallback(() => {
        handleControlAction(() => actions.togglePlayback());
    }, [actions, handleControlAction]);

    const handleSkipToNext = useCallback(() => {
        handleControlAction(() => actions.skipToNext());
    }, [actions, handleControlAction]);

    const handleSkipToPrevious = useCallback(() => {
        handleControlAction(() => actions.skipToPrevious());
    }, [actions, handleControlAction]);


    return (
        <div className={'controls ' + (isDisabled ? 'disabledControls' : '')}>
            <div onClick={handleSkipToPrevious} className='controlButton'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M220-240v-480h80v480h-80Zm520 0L380-480l360-240v480Z" /></svg>
            </div>
            <div onClick={handleTogglePlayback} className='controlButton playButton'>
                {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M560-200v-560h160v560H560Zm-320 0v-560h160v560H240Z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M320-200v-560l440 280-440 280Z" /></svg>}
            </div>
            <div onClick={handleSkipToNext} className='controlButton'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Z" /></svg>
            </div>
        </div>
    );
};