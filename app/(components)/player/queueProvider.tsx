import { getArticles } from "@/app/(domain)/app/articles/articles";
import { DEBUG_QUEUE_CACHE as LOG, LOG_PRIORITY, NP_ALBUM_SIZES, QUEUE_CACHE_DELAY, QUEUE_CACHE_NUMBER, QUEUE_SYNC_INTERVAL, SUMMARY_IMAGE_SIZES } from "@/app/(domain)/app/config";
import { DEFAULT_QUEUE_CONTEXT, PlaybackContext, QueueContext, QueueContextObject, SpotifyClientContext, TrackContext, TrackContextObject } from "@/app/(domain)/app/context";
import { streamSummary } from "@/app/(domain)/app/summary/summary";
import { isCompleteTrackCachedLocally, loadTrackProperty } from "@/app/(domain)/site/cache";
import { syncMetadata } from "@/app/(domain)/spotify/metadata";
import { syncQueue } from "@/app/(domain)/spotify/queue";
import { wait } from "@/app/(domain)/utilities/fetch";
import { SimplifiedTrack, Track } from "@spotify/web-api-ts-sdk";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Image from 'next/image';
import PlaylistsWithTrackList from "./playlistList";


export function QueueProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);
    const playbackState = useContext(PlaybackContext);

    const [queueObject, setQueueObject] = useState<QueueContextObject>(DEFAULT_QUEUE_CONTEXT);

    const syncIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);
    const handleQueueSync = useCallback(async () => {
        clearInterval(syncIntervalID.current);
        syncQueue(spotifyClient.api, queueObject, setQueueObject);

        syncIntervalID.current = setInterval(() => syncQueue(spotifyClient.api, queueObject, setQueueObject), QUEUE_SYNC_INTERVAL);

        return () => {
            clearInterval(syncIntervalID.current);
        }
    }, []);

    // Setup sync interval on login
    useEffect(() => {
        handleQueueSync();
    }, [spotifyClient, playbackState.playbackState?.item]);

    return (
        <QueueContext.Provider value={queueObject}>
            {children}
            <QueueCache />
        </QueueContext.Provider>
    );
}


function QueueCache() {
    const spotifyClient = useContext(SpotifyClientContext);
    const queue = useContext(QueueContext);
    const playbackState = useContext(PlaybackContext);

    const shortQueue = queue.queue?.slice(0, QUEUE_CACHE_NUMBER);
    const [albumCovers, setAlbumCovers] = useState<string[]>([]);



    const handleTrackCache = useCallback(async (queue: SimplifiedTrack[], index: number) => {
        if (!queue[index]?.id || !spotifyClient.api || !playbackState.playbackState) return;
        if (isCompleteTrackCachedLocally(queue[index].id)) return handleTrackCache(queue, index + 1);

        if (LOG) console.log('[QUEUE-CACHE] Caching track:', queue[index].name);

        await wait(QUEUE_CACHE_DELAY);

        const track = await spotifyClient.api.tracks.get(queue[index].id);
        const emulatedPlaybackState = {
            ...playbackState.playbackState,
            item: track as Track,
            is_playing: false,
            progress_ms: 0
        };

        await syncMetadata(spotifyClient.api, spotifyClient.user, emulatedPlaybackState, { state: 'waiting' }, () => true, () => { });
        const articles = await getArticles(track as Track);
        await streamSummary(track as Track, articles, {}, () => { }, () => track.id, { state: 'articles', percent: 100 }, () => { });
        setAlbumCovers([...albumCovers, track.album.images[0].url]);

        if (LOG_PRIORITY) {
            const summary = await loadTrackProperty<string>(track.id, 'summary');
            console.log('[CACHE] Cached track \'' + track.name + '\' with ' + articles.length + ' articles and ' + summary?.split(' ').length + ' word summary.');
        }

        if (queue.length > index + 1)
            handleTrackCache(queue, index + 1);
    }, []);

    useEffect(() => {
        if (LOG) console.log('[QUEUE-CACHE] Caching queue:', queue.queue?.map((track) => track.name).join(', '));
        if (!shortQueue || shortQueue.length === 0) return;

        handleTrackCache(shortQueue, 0);
    }, [spotifyClient, queue.queue]);


    return (
        <div style={{ display: 'none' }}>
            {albumCovers.map((url, index) => <Image key={index + 'cacheAlbumCover'} src={url} alt={''} fill sizes={SUMMARY_IMAGE_SIZES} />)}
            {shortQueue?.map((track) => <PlaylistsWithTrackList key={track.id + 'cachePlaylists'} track={track} />)}
        </div>
    )
}