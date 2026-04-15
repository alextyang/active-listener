import { Devices, PlaybackState, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { PlaybackSyncState, TrackContextObject, TrackSyncState } from "../app/context";
import { DEBUG_NOW_PLAYING as LOG2, DEBUG_PLAYER_CONTROLS as LOG1, TRACK_AUTO_POLL_INTERVAL, TRACK_END_POLL_DELAY, PLAY_AFTER_SEEK, CONTROL_RESYNC_LATENCY, TIMESTAMP_ERROR_MARGIN } from "../app/config";

// Controls
export async function togglePlayback(client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !setPlaybackState) return;
    const wasPlaying = playbackState?.is_playing ?? false;

    if (wasPlaying) {
        await pausePlayback(client, playbackState, handlePlaybackSync, setPlaybackState);
    } else
        await playPlayback(client, playbackState, handlePlaybackSync, setPlaybackState);

    return;
}

export async function playPlayback(client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !setPlaybackState || !handlePlaybackSync) return;
    let deviceId: string | undefined;

    try {
        deviceId = await getDeviceID(client, playbackState);
        if (playbackState) setPlaybackState({ ...playbackState, is_playing: true, timestamp: Date.now() });
        const result = await runSpotifyPlayerCommand(() => client.player.startResumePlayback(deviceId ?? ''));
        if (LOG1) console.log('[PLAYER-CONTROLS] Resumed playback.');

        if (!playbackState || result.normalized)
            refreshAfterAction(handlePlaybackSync);

    } catch (error) {
        refreshAfterAction(handlePlaybackSync);
        console.error('[PLAYER-CONTROLS] Error resuming playback:', error, deviceId, playbackState);
    }
}

export async function pausePlayback(client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !setPlaybackState || !handlePlaybackSync) return;

    try {
        const id = await getDeviceID(client, playbackState);
        if (playbackState) setPlaybackState({ ...playbackState, is_playing: false, timestamp: Date.now(), progress_ms: getProgressMilliseconds(playbackState) });
        const result = await runSpotifyPlayerCommand(() => client.player.pausePlayback(id ?? ''));
        if (LOG1) console.log('[PLAYER-CONTROLS] Paused playback.');

        if (!playbackState || result.normalized)
            refreshAfterAction(handlePlaybackSync);

    } catch (error) {
        refreshAfterAction(handlePlaybackSync);
        console.error('[PLAYER-CONTROLS] Error pausing playback:', error);
    }
}

export async function skipToNext(client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !playbackState || !setPlaybackState || !handlePlaybackSync) return;

    try {
        const id = await getDeviceID(client, playbackState);
        if (playbackState)
            setPlaybackState({ ...playbackState, is_playing: true, timestamp: Date.now(), progress_ms: 0 });

        await runSpotifyPlayerCommand(() => client.player.skipToNext(id ?? ''));
        refreshAfterAction(handlePlaybackSync);
        if (LOG1) console.log('[PLAYER-CONTROLS] Skipped to next track.');
    } catch (error) {
        refreshAfterAction(handlePlaybackSync);
        console.error('[PLAYER-CONTROLS] Error skipping to next track:', error);
    }
}

export async function skipToPrevious(client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !playbackState || !setPlaybackState || !handlePlaybackSync) return;

    try {
        const id = await getDeviceID(client, playbackState);
        if (playbackState)
            setPlaybackState({ ...playbackState, is_playing: true, timestamp: Date.now(), progress_ms: 0 });

        await runSpotifyPlayerCommand(() => client.player.skipToPrevious(id ?? ''));
        refreshAfterAction(handlePlaybackSync);
        if (LOG1) console.log('[PLAYER-CONTROLS] Skipped to previous track.');
    } catch (error) {
        refreshAfterAction(handlePlaybackSync);
        console.error('[PLAYER-CONTROLS] Error skipping to previous track:', error);
    }
}

export async function setProgress(percent: number, client?: SpotifyApi, playbackState?: PlaybackState, handlePlaybackSync?: () => Promise<void>, setPlaybackState?: (state?: PlaybackState) => void) {
    if (!client || !playbackState || !setPlaybackState || !handlePlaybackSync) return false;

    const id = playbackState.device?.id ?? '';
    const duration = playbackState.item?.duration_ms ?? 0;

    try {
        setPlaybackState({ ...playbackState, progress_ms: Math.round(percent * duration), timestamp: Date.now() });
        const result = await runSpotifyPlayerCommand(() => client.player.seekToPosition(Math.round(percent * duration), id));
        if (LOG1) console.log('[PLAYER-CONTROLS] Set progress:', percent);
        if (result.normalized)
            refreshAfterAction(handlePlaybackSync);

        if (PLAY_AFTER_SEEK && !playbackState.is_playing)
            await playPlayback(client, playbackState, handlePlaybackSync, setPlaybackState);

    } catch (error) {
        refreshAfterAction(handlePlaybackSync);
        console.error('[PLAYER-CONTROLS] Error setting progress:', error);
    }
}

export async function addToPlaybackQueue(client?: SpotifyApi, uri?: string): Promise<{ ok: boolean; error?: string }> {
    if (!client || !uri) {
        return {
            ok: false,
            error: "Spotify playback is unavailable.",
        };
    }

    try {
        const result = await runSpotifyPlayerCommand(() => client.player.addItemToPlaybackQueue(uri));
        return { ok: result.ok };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to add track to queue.",
        };
    }
}

async function getDeviceID(client?: SpotifyApi, playbackState?: PlaybackState): Promise<string | undefined> {
    if (!client) return undefined;
    if (playbackState?.device?.id) return playbackState.device.id;

    const devices = await client.player.getAvailableDevices();
    if (LOG1) console.log('[PLAYER-CONTROLS] No device found, trying first available:', devices.devices[0]);

    if (devices.devices.length > 0)
        return devices.devices[0].id ?? undefined;
    return undefined;
}

function refreshAfterAction(handlePlaybackSync: () => Promise<void>) {
    setTimeout(() => handlePlaybackSync(), CONTROL_RESYNC_LATENCY);
}

function isSpotifyResponseParseError(error: unknown) {
    if (!(error instanceof Error)) return false;

    return error instanceof SyntaxError
        || error.message.includes("Unexpected end of JSON input")
        || error.message.includes("Unable to parse JSON string")
        || error.message.includes("JSON Parse error");
}

async function runSpotifyPlayerCommand(command: () => Promise<unknown>): Promise<{ ok: true; normalized: boolean }> {
    try {
        await command();
        return { ok: true, normalized: false };
    } catch (error) {
        if (isSpotifyResponseParseError(error))
            return { ok: true, normalized: true };
        throw error;
    }
}


// Render controls
export function shouldDisplayPlaying(playbackState?: PlaybackState): boolean {
    return playbackState?.is_playing ?? false;
}

export function shouldDisplayControls(playbackState?: PlaybackState): boolean {
    return !playbackState?.item;
}



// Now playing
export async function getPlaybackState(client?: SpotifyApi, setFetchState?: (state: PlaybackSyncState) => void): Promise<PlaybackState | undefined> {
    if (!client) return undefined;

    if (setFetchState) setFetchState({ state: 'playback' });
    const playbackState = await fetchPlaybackState(client);

    if (!playbackState || !playbackState.item) {
        if (LOG2) console.log('[PLAYER-SYNC] No playback found.');
        if (setFetchState) setFetchState({ state: 'waiting' });
        return undefined;
    }

    if (LOG2) console.log('[PLAYER-SYNC] Playback found.', playbackState);
    if (setFetchState) setFetchState({ state: 'waiting' });
    if (Date.now() - playbackState.timestamp > TIMESTAMP_ERROR_MARGIN) playbackState.timestamp = Date.now();
    return playbackState;
}

async function fetchPlaybackState(client: SpotifyApi) {
    try {
        return await client.player.getCurrentlyPlayingTrack();
    }
    catch (error) {
        console.error('[PLAYER-SYNC] Error fetching playback state:', error);
        return undefined;
    }
}

export function scheduleTrackEndUpdate(client?: SpotifyApi, playbackState?: PlaybackState, setPlaybackState?: (state?: PlaybackState) => void, setCurrentTrack?: (value: TrackContextObject) => void, setFetchState?: (state: PlaybackSyncState) => void) {
    if (!client || !playbackState || !setPlaybackState || !setCurrentTrack) return undefined;
    if (!playbackState.item || !playbackState.is_playing) return undefined;
    if (getTimeLeft(playbackState) < TRACK_END_POLL_DELAY) return undefined;

    return scheduleAction(getTimeLeft(playbackState) ?? 0 + TRACK_END_POLL_DELAY, async () => {
        if (LOG2) console.log('[PLAYER-SYNC] Track ended, updating state.');
        setCurrentTrack({});
        getPlaybackState(client, setFetchState).then(setPlaybackState);
    });
}

export function scheduleRegularUpdate(client?: SpotifyApi, setPlaybackState?: (state?: PlaybackState) => void, setFetchState?: (state: PlaybackSyncState) => void) {
    if (!client || !setPlaybackState) return undefined;
    return scheduleAction(TRACK_AUTO_POLL_INTERVAL, async () => {
        if (LOG2) console.log('[PLAYER-SYNC] Regular update.');
        getPlaybackState(client, setFetchState).then(setPlaybackState);
    });
}

function scheduleAction(delay: number, action: () => void) {
    return setTimeout(action, delay);
}

export function getTimeLeft(playbackState: PlaybackState): number {
    return playbackState.item.duration_ms - playbackState.progress_ms - (Date.now() - playbackState.timestamp);
}

export function getProgressPercent(playbackState?: PlaybackState): number {
    if (!playbackState || !playbackState.item || !playbackState.item.duration_ms) return 0;
    // console.log('progress: ' + (playbackState.progress_ms / 1000).toFixed(1) + 's\toffset:' + ((Date.now() - playbackState.timestamp) / 1000).toFixed(1) + 's\tpercentage: ' + (getProgressMilliseconds(playbackState) / playbackState.item.duration_ms * 100).toFixed(1) + '%');
    return getProgressMilliseconds(playbackState) / playbackState.item.duration_ms;
}

export function getProgressMilliseconds(playbackState?: PlaybackState): number {
    if (!playbackState || !playbackState.item || !playbackState.item.duration_ms) return 0;
    return playbackState.progress_ms + (Date.now() - playbackState.timestamp);
}
