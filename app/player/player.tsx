import { useContext, useEffect, useRef, useState } from "react";
import { SpotifyClientContext, CurrentPlaybackContext, CurrentTrackInfoContext } from "../context";
import { Album, Artist, PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import Timeline from "./components/timeline";
import { Articles } from "./body/articles/articles";
import Controls from "./components/controls";
import TrackInfo from "./components/songinfo";
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
    const [currentTrack, setCurrentTrack] = useState<{ playbackState: PlaybackState } | null>(null);
    const [currentTrackInfo, setCurrentTrackInfo] = useState<{ track: Track, album: Album, artists: Artist[] } | null>(null);

    useEffect(() => {
        const updateTrack = () => {
            if (spotifyClient) {
                spotifyClient.player.getCurrentlyPlayingTrack().then((playbackState) => {
                    if (!playbackState || !playbackState.item) {
                        return setCurrentTrack(null);
                    }

                    clearTimeout(trackTimeoutID.current);
                    trackTimeoutID.current = setTimeout(updateTrack, playbackState.item.duration_ms - playbackState.progress_ms + 10);

                    if (currentTrack && currentTrackInfo && currentTrack.playbackState.item.id === currentTrackInfo.track.id)
                        return setCurrentTrack({ playbackState: playbackState });

                    spotifyClient.tracks.get(playbackState.item.id).then((track) => {
                        spotifyClient.albums.get(track.album.id).then((album) => {
                            spotifyClient.artists.get(track.artists.map((artist) => artist.id)).then((artists) => {
                                setCurrentTrack({ playbackState: playbackState });
                                setCurrentTrackInfo({ album: album, track: track, artists: artists });
                                console.log('[PLAY] Track details found:', playbackState);
                            });
                        });
                    });
                });
            }
        };

        clearInterval(trackUpdateIntervalID.current);
        trackUpdateIntervalID.current = setInterval(() => {
            updateTrack();

        }, UPDATE_INTERVAL);

    }, [currentTrack, currentTrackInfo, spotifyClient]);

    return (
        <CurrentPlaybackContext.Provider value={currentTrack}>
            <CurrentTrackInfoContext.Provider value={currentTrackInfo}>
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
            </CurrentTrackInfoContext.Provider>
        </CurrentPlaybackContext.Provider>
    )
}