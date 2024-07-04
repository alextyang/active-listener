import React, { useContext, useEffect, useState } from 'react';
import { ActionContext, PlaybackContext, SpotifyClientContext } from '@/app/context';
import { Devices } from '@spotify/web-api-ts-sdk';

const DISABLED_TIMEOUT = 100;

export default function Controls() {
    const client = useContext(SpotifyClientContext);
    const playback = useContext(PlaybackContext);
    const actions = useContext(ActionContext);

    const [isPlaying, setIsPlaying] = useState(playback?.playbackState?.is_playing ?? false);
    const [isDisabled, setIsDisabled] = useState(false);

    useEffect(() => {
        setIsPlaying(playback?.playbackState?.is_playing ?? false);
    }, [playback?.playbackState?.is_playing]);

    const skipToPrevious = async () => {
        if (isDisabled || !client.api) return;
        setIsDisabled(true);

        setIsPlaying(true);
        if (playback.playbackState?.device)
            client.api.player.skipToPrevious(playback.playbackState?.device?.id ?? '');
        else {
            client.api.player.getAvailableDevices().then((devices: Devices) => {
                if (devices.devices.length > 0)
                    client.api?.player.skipToPrevious(devices.devices[0].id ?? '');
            });
        }
        setTimeout(() => { actions.setShouldUpdate(true); }, 500);

        setTimeout(() => { setIsDisabled(false); }, DISABLED_TIMEOUT);
    };

    const skipToNext = async () => {
        if (isDisabled || !client.api) return;
        setIsDisabled(true);

        setIsPlaying(true);
        if (playback.playbackState?.device)
            client.api.player.skipToNext(playback.playbackState?.device?.id ?? '');
        else {
            client.api.player.getAvailableDevices().then((devices: Devices) => {
                if (devices.devices.length > 0)
                    client.api?.player.skipToNext(devices.devices[0].id ?? '');
            });
        }
        setTimeout(() => { actions.setShouldUpdate(true); }, 500);

        setTimeout(() => { setIsDisabled(false); }, DISABLED_TIMEOUT);
    };

    const togglePlay = () => {
        if (isDisabled || !client.api) return;

        if (isPlaying) {
            setIsPlaying(false);
            if (playback.playbackState)
                playback.playbackState.is_playing = false;
            client.api.player.pausePlayback(playback.playbackState?.device?.id ?? '');
        } else {
            setIsPlaying(true);
            if (playback.playbackState)
                playback.playbackState.is_playing = true;
            if (playback.playbackState?.device)
                client.api.player.startResumePlayback(playback.playbackState?.device?.id ?? '');
            else {
                client.api.player.getAvailableDevices().then((devices: Devices) => {
                    if (devices.devices.length > 0)
                        client.api?.player.startResumePlayback(devices.devices[0].id ?? '');
                });
            }
        }

        setIsDisabled(true);
        setTimeout(() => { setIsDisabled(false); }, DISABLED_TIMEOUT);
    };



    return (
        <div className={'controls ' + (isDisabled ? 'disabledControls' : '')}>
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