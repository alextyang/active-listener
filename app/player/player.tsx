import { Dispatch, SetStateAction, act, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SpotifyClientContext, PlaybackContext, TrackContext, ActionContext, PlaybackStateObject, TrackContextObject, ActionContextObject, FetchContext, FetchState } from "../context";
import { Album, Artist, AudioFeatures, Market, Page, PlaybackState, SpotifyApi, TopTracksResult, Track, TrackItem, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import Timeline from "./components/timeline";
import { Articles } from "./body/articles/articles";
import Controls from "./components/controls";
import TrackInfo from "./components/trackInfo";
import PlaybackBackground from "./components/background";
import GenreList from "./body/components/genres";
import ControlIcons from "./body/components/controlIcons";
import { SpotifyLogoWhite } from "./body/components/spotifyLogo";
import Link from "next/link";
import { Body } from "./body/body";


const UPDATE_INTERVAL = 600 * 1000;
const REQUEST_DELAY = 1 * 1000;
const MAX_ALBUMS = 20;

export default function PlayerPage() {
    const spotifyClient = useContext(SpotifyClientContext);
    const router = useRouter();

    // MONITORING
    const [fetchState, setFetchState] = useState<FetchState>({ state: 'no-track', percent: 0 });

    // PLAYBACK
    const trackTimeoutID = useRef<NodeJS.Timeout | undefined>(undefined);
    const trackUpdateIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);

    const [shouldUpdate, setShouldUpdate] = useState(true);

    const [playbackInfo, setPlaybackInfo] = useState<PlaybackStateObject>({});
    const [currentTrack, setCurrentTrack] = useState<TrackContextObject>({});

    const fetchedTrackID = useRef<string | undefined>(undefined);


    const togglePlayback = useCallback(async (shouldPlay: boolean) => {
        if (!spotifyClient) return;
        const id = playbackInfo?.playbackState?.device?.id ?? '';

        if (!shouldPlay) {
            setPlaybackInfo({ ...playbackInfo, playbackState: { ...playbackInfo.playbackState as PlaybackState, is_playing: false } });
            await spotifyClient.api.player.pausePlayback(id);
        } else {
            await spotifyClient.api.player.startResumePlayback(id);
        }

    }, [playbackInfo, spotifyClient]);

    const setProgress = useCallback((percent: number) => {
        if (!spotifyClient) return;
        const id = playbackInfo?.playbackState?.device?.id ?? '';
        const duration = playbackInfo?.playbackState?.item.duration_ms ?? 0;

        spotifyClient.api.player.seekToPosition(Math.round(percent * duration), id);
    }, [playbackInfo?.playbackState?.device?.id, playbackInfo?.playbackState?.item.duration_ms, spotifyClient]);

    const [actions, setActions] = useState<ActionContextObject>({ togglePlayback: togglePlayback, setProgress: setProgress, setShouldUpdate: setShouldUpdate, isUpdating: false });

    const handleVisibilityChange = useCallback(() => {
        // console.log('[SYNC] Visibility changed:', !document.hidden);
        if (!currentTrack?.track)
            setShouldUpdate(!document.hidden);
    }, [currentTrack?.track]);

    useEffect(() => {
        window.addEventListener('focus', handleVisibilityChange);
        return () => {
            window.removeEventListener('focus', handleVisibilityChange);
        }
    }, [handleVisibilityChange]);

    useEffect(() => {
        const createDelayedPromises = async (promises: (() => Promise<any>)[]) => {
            for (const promise of promises) {
                await promise();
                await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
            }
        };

        const syncState = async () => {
            if (!spotifyClient || !shouldUpdate) return;
            if (document.hidden) return;

            clearTimeout(trackTimeoutID.current);

            const fetchedPlaybackState = await spotifyClient.api.player.getCurrentlyPlayingTrack()

            // No current track
            if (!fetchedPlaybackState || !fetchedPlaybackState.item) {
                // console.log('[PLAY] No track found');
                setActions({ ...actions, isUpdating: false });
                return setPlaybackInfo({});
            }

            // Schedule track update based on duration
            trackTimeoutID.current = setTimeout(async () => {
                console.log('[PLAY] Track ended, updating state');
                if (playbackInfo.playbackState?.is_playing)
                    await syncState();
            }, fetchedPlaybackState.item.duration_ms - fetchedPlaybackState.progress_ms + 1000);

            // console.log('[PLAY] Playback state found:', fetchedPlaybackState);
            setPlaybackInfo({ playbackState: fetchedPlaybackState });
            await updateTrack(fetchedPlaybackState);

            setActions({ ...actions, isUpdating: false });
            // console.log('[PLAY] Finished track state update');
        }

        const updateTrack = async (playbackState: PlaybackState) => {
            if (!spotifyClient) return;
            if (playbackState.item.id == fetchedTrackID.current) return console.log('[PLAY] Track already loaded:', playbackState);
            fetchedTrackID.current = playbackState.item.id;

            setFetchState({ state: 'track', percent: 0 });

            const track = playbackState.item as Track;
            setCurrentTrack({ track: track });
            // console.log('[TRACK] Track found:', track);

            const artists = await spotifyClient.api.artists.get(track.artists.map((artist) => artist.id));

            const album = await spotifyClient.api.albums.get(track.album.id);

            setCurrentTrack({ track: track, album: album, artists: artists });
            // console.log('[TRACK] Metadata context found:', album, artists);

            const topTracks = await Promise.all(artists.map((artist) => spotifyClient.api.artists.topTracks(artist.id, spotifyClient.user?.country as Market ?? "US" as Market)));

            const [...siblingSimplifiedAlbumsArray] = await Promise.all(artists.map((artist) => spotifyClient.api.artists.albums(artist.id, 'album', undefined, MAX_ALBUMS)));

            const albumIDs = siblingSimplifiedAlbumsArray.map((albums) => albums.items.map((album) => album.id)).flat();
            const [...albumIDsChunks] = albumIDs.reduce<string[][]>((resultArray, item, index) => {
                const chunkIndex = Math.floor(index / 20)

                if (!resultArray[chunkIndex]) {
                    resultArray[chunkIndex] = [] as string[] // start a new chunk
                }

                resultArray[chunkIndex].push(item)

                return resultArray
            }, []);

            const [...siblingAlbums] = await Promise.all(albumIDsChunks.map((albumIDs) => spotifyClient.api.albums.get(albumIDs)));

            setCurrentTrack({ track: track, artists: artists, album: album, topTracks: topTracks, siblingAlbums: siblingAlbums.flat() });
            console.log('[TRACK] Track found:', { track: track, artists: artists, album: album, topTracks: topTracks, siblingAlbums: siblingAlbums.flat() });

            return;
        }

        if (shouldUpdate) {
            console.log('[SYNC] Triggered manually, shouldUpdate:', shouldUpdate);
            syncState();
        }

        clearInterval(trackUpdateIntervalID.current);
        trackUpdateIntervalID.current = setInterval(async () => {
            console.log('[SYNC] Triggered automatically');
            await syncState();
        }, UPDATE_INTERVAL);

        if (shouldUpdate)
            setShouldUpdate(false);
    }, [spotifyClient, shouldUpdate, actions]);

    return (
        <PlaybackContext.Provider value={playbackInfo}>
            <TrackContext.Provider value={currentTrack}>
                <ActionContext.Provider value={actions}>
                    <FetchContext.Provider value={{ update: setFetchState, state: fetchState }}>
                        <div className="player">
                            <PlaybackBackground />
                            <TrackInfo></TrackInfo>
                            <Timeline></Timeline>
                            <Controls></Controls>
                        </div>
                        <Body></Body>
                    </ FetchContext.Provider>
                </ActionContext.Provider>
            </TrackContext.Provider>
        </PlaybackContext.Provider>
    )
}