import { useContext, useEffect, useRef, useState } from "react";
import { SpotifyClientContext, PlaybackContext, TrackContext, TrackDetailsContext } from "../context";
import { Album, Artist, AudioFeatures, PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import Timeline from "./components/timeline";
import { Articles } from "./body/articles/articles";
import Controls from "./components/controls";
import TrackInfo from "./components/trackInfo";
import PlaybackBackground from "./components/background";
import GenreList from "./body/components/genres";
import ControlIcons from "./body/components/controlIcons";
import { SpotifyLogo } from "./body/components/spotify";


const UPDATE_INTERVAL = 1000;

export default function PlayerPage() {
    const spotifyClient = useContext(SpotifyClientContext);
    const router = useRouter();


    if (!spotifyClient)
        router.push('/');

    // PLAYBACK
    const trackTimeoutID = useRef<NodeJS.Timeout | undefined>(undefined);
    const trackUpdateIntervalID = useRef<NodeJS.Timeout | undefined>(undefined);
    const [playbackInfo, setPlaybackInfo] = useState<{ playbackState: PlaybackState } | null>(null);
    const [currentTrack, setCurrentTrack] = useState<{ track: Track } | null>(null);
    const [currentTrackDetails, setCurrentTrackDetails] = useState<{ album: Album, artists: Artist[], features: AudioFeatures } | null>(null);

    useEffect(() => {
        const updateTrack = () => {
            if (spotifyClient) {
                spotifyClient.player.getCurrentlyPlayingTrack().then((playbackState) => {
                    if (!playbackState || !playbackState.item) {
                        return setPlaybackInfo(null);
                    }

                    clearTimeout(trackTimeoutID.current);
                    trackTimeoutID.current = setTimeout(updateTrack, playbackState.item.duration_ms - playbackState.progress_ms + 10);

                    if (playbackInfo && currentTrack && playbackInfo.playbackState.item.id === currentTrack.track.id)
                        return setPlaybackInfo({ playbackState: playbackState });

                    spotifyClient.tracks.get(playbackState.item.id).then((track) => {
                        setPlaybackInfo({ playbackState: playbackState });
                        setCurrentTrack({ track: track });
                        setCurrentTrackDetails(null);
                        console.log('[PLAY] Track found:', playbackState);


                        Promise.all([spotifyClient.albums.get(track.album.id), spotifyClient.artists.get(track.artists.map((artist) => artist.id)), spotifyClient.tracks.audioFeatures(track.id)]).then(([album, artists, features]) => {
                            setCurrentTrackDetails({ album: album, artists: artists, features: features });
                            console.log('[PLAY] Track details found:', { album: album, artists: artists, features: features });
                        });
                    });
                });
            }
        };

        clearInterval(trackUpdateIntervalID.current);
        trackUpdateIntervalID.current = setInterval(() => {
            updateTrack();

        }, UPDATE_INTERVAL);

    }, [playbackInfo, currentTrack, spotifyClient]);

    return (
        <PlaybackContext.Provider value={playbackInfo}>
            <TrackContext.Provider value={currentTrack}>
                <TrackDetailsContext.Provider value={currentTrackDetails}>
                    <div className="player">
                        <PlaybackBackground />
                        <TrackInfo></TrackInfo>
                        <Timeline></Timeline>
                        <Controls></Controls>
                    </div>
                    <div className='body'>
                        <div className="subPlayer">
                            <GenreList>
                                <SpotifyLogo></SpotifyLogo>
                            </GenreList>
                            <ControlIcons></ControlIcons>
                        </div>
                        <Articles></Articles>
                    </div>
                </TrackDetailsContext.Provider>
            </TrackContext.Provider>
        </PlaybackContext.Provider>
    )
}