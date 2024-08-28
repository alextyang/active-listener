import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActionContext, PlaybackContext, SpotifyClientContext } from '@/app/(domain)/app/context';
import { shouldDisplayPlaying } from '@/app/(domain)/spotify/player';
import { CONTROL_DISABLED_TIMEOUT } from '@/app/(domain)/app/config';
import { PauseIcon, PlayIcon, SkipToNextIcon, SkipToPreviousIcon } from '../../icons';


export default function Controls() {
    const playback = useContext(PlaybackContext);
    const actions = useContext(ActionContext);
    const [isDisabled, setIsDisabled] = useState(false);

    const isPlaying = shouldDisplayPlaying(playback?.playbackState);
    const disabledClassName = isDisabled ? 'disabledControls' : '';
    const playPauseIcon = isPlaying ? <PauseIcon /> : <PlayIcon />;


    const handleControlAction = useCallback((callback: () => void) => {
        if (isDisabled) return;
        callback();

        setIsDisabled(true);
        setTimeout(() => { setIsDisabled(false); }, CONTROL_DISABLED_TIMEOUT);
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
        <div className={'controls ' + disabledClassName}>
            <div onClick={handleSkipToPrevious} className='controlButton'>
                <SkipToPreviousIcon />
            </div>
            <div onClick={handleTogglePlayback} className='controlButton playButton'>
                {playPauseIcon}
            </div>
            <div onClick={handleSkipToNext} className='controlButton'>
                <SkipToNextIcon />
            </div>
        </div>
    );
};