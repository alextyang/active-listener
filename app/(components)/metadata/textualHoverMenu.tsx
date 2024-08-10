
import { Album, Artist, SimplifiedTrack, Track } from "@spotify/web-api-ts-sdk";
import Image from "next/image";
import { useContext, useState } from "react";
import { TrackContext, PlaybackContext, SpotifyClientContext } from "../../(domain)/context";
import { Article } from "../../(domain)/types";
import { HoverMenuLink, HoverMenu } from "../utilities/hoverMenu";


export function ArtistHoverMenu({ artist, children }: { artist: Artist, children: React.ReactNode }) {
    return (
        <HoverMenuLink className="textualHoverMenu artistHoverMenu" href={artist.uri} menu={(
            <>
                <div className="textualIcon">
                    <Image src={artist.images[0].url} alt='' fill></Image>
                </div>
                <div className="textualIcon" title='Open Artist Page'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M218.87-135.87q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-522.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26H480v83H218.87v522.26h522.26V-480h83v261.13q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H218.87ZM394.41-336 336-394.41l346.72-346.72H576v-83h248.13V-576h-83v-106.72L394.41-336Z" /></svg>
                </div>
            </>
        )}>
            {children}
        </HoverMenuLink >
    )
}

export function AlbumHoverMenu({ album, children }: { album?: Album, children: React.ReactNode }) {
    if (!album) return <>{children}</>
    return (
        <HoverMenuLink className="textualHoverMenu albumHoverMenu" href={album.uri} menu={(
            <>
                <div className="textualIcon">
                    <Image src={album.images[0].url} alt='' fill></Image>
                </div>
                <div className="textualIcon" title='Open Album Page'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M218.87-135.87q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-522.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26H480v83H218.87v522.26h522.26V-480h83v261.13q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H218.87ZM394.41-336 336-394.41l346.72-346.72H576v-83h248.13V-576h-83v-106.72L394.41-336Z" /></svg>
                </div>
            </>
        )}>
            {children}
        </HoverMenuLink >
    )
}

export function TrackHoverMenu({ track, children }: { track: Track | SimplifiedTrack, children: React.ReactNode }) {
    const currentTrack = useContext(TrackContext);
    const playback = useContext(PlaybackContext);
    const client = useContext(SpotifyClientContext);
    const id = playback?.playbackState?.device?.id ?? '';

    const [isSuccessful, setIsSuccessful] = useState(false);

    if (!client) return (
        <HoverMenuLink className="textualHoverMenu albumHoverMenu" href={track.uri} menu={(
            <>
                {Object.keys(track).includes('album') ? (
                    <div className="textualIcon">
                        <Image src={(track as Track).album.images[0].url} alt='' fill></Image>
                    </div>
                ) : (
                    <div className="textualIcon">
                        <Image src={currentTrack?.track?.album.images[0].url ?? ''} alt='' fill></Image>
                    </div>
                )}
                <div className="textualIcon" title='Open Album Page'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M218.87-135.87q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-522.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26H480v83H218.87v522.26h522.26V-480h83v261.13q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H218.87ZM394.41-336 336-394.41l346.72-346.72H576v-83h248.13V-576h-83v-106.72L394.41-336Z" /></svg>
                </div>
            </>
        )}>
            {children}
        </HoverMenuLink >
    );
    return (
        <HoverMenu className="textualHoverMenu trackHoverMenu" onClick={() => {
            if (client.api && currentTrack?.track?.id === track.id && playback?.playbackState) {
                if (playback?.playbackState?.is_playing) {
                    client.api.player.pausePlayback(id);
                } else {
                    client.api.player.startResumePlayback(id);
                }
            } else if (client.api) {
                client.api.player.addItemToPlaybackQueue(track.uri);
                setIsSuccessful(true);
            }
        }} menu={(
            <>
                {Object.keys(track).includes('album') ? (
                    <div className="textualIcon">
                        <Image src={(track as Track).album.images[0].url} alt='' fill></Image>
                    </div>
                ) : (
                    <div className="textualIcon">
                        <Image src={currentTrack?.track?.album.images[0].url ?? ''} alt='' fill></Image>
                    </div>
                )}
                {currentTrack?.track?.id === track.id ?
                    (playback?.playbackState?.is_playing ? (
                        <div className="textualIcon" title='Pause Playback'>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M356.41-318.09H440v-323.82h-83.59v323.82Zm163.59 0h83.59v-323.82H520v323.82ZM480-71.87q-84.91 0-159.34-32.12-74.44-32.12-129.5-87.17-55.05-55.06-87.17-129.5Q71.87-395.09 71.87-480t32.12-159.34q32.12-74.44 87.17-129.5 55.06-55.05 129.5-87.17 74.43-32.12 159.34-32.12t159.34 32.12q74.44 32.12 129.5 87.17 55.05 55.06 87.17 129.5 32.12 74.43 32.12 159.34t-32.12 159.34q-32.12 74.44-87.17 129.5-55.06 55.05-129.5 87.17Q564.91-71.87 480-71.87Z" /></svg>
                        </div>
                    ) : (
                        <div className="textualIcon" title='Resume Playback'>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M378.09-296.65 663.35-480 378.09-663.35v366.7ZM480-71.87q-84.91 0-159.34-32.12-74.44-32.12-129.5-87.17-55.05-55.06-87.17-129.5Q71.87-395.09 71.87-480t32.12-159.34q32.12-74.44 87.17-129.5 55.06-55.05 129.5-87.17 74.43-32.12 159.34-32.12t159.34 32.12q74.44 32.12 129.5 87.17 55.05 55.06 87.17 129.5 32.12 74.43 32.12 159.34t-32.12 159.34q-32.12 74.44-87.17 129.5-55.06 55.05-129.5 87.17Q564.91-71.87 480-71.87Z" /></svg>
                        </div>
                    ))
                    : (!isSuccessful ? (
                        <div className="textualIcon" title='Add to Queue'>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M114.5-311.15v-91h294.59v91H114.5Zm0-167.42v-91h451v91h-451Zm0-167.41v-91h451v91h-451Zm527.41 491v-156.17H485.5v-91h156.41v-156.42h91v156.42h156.18v91H732.91v156.17h-91Z" /></svg>
                        </div>
                    ) : (
                        <div className="textualIcon" title='Added to Queue'>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M114.5-311.15v-91H440v91H114.5Zm0-167.42v-91h483.59v91H114.5Zm0-167.41v-91h483.59v91H114.5Zm543.09 460.57L507.93-335.07l63.66-63.65 86 84 170-169.76 63.89 65.41-233.89 233.66Z" /></svg>
                        </div>
                    )
                    )}

            </>
        )}>
            {children}
        </HoverMenu >
    )
}

export function ArticleHoverMenu({ article, children }: { article: Article, children: React.ReactNode }) {
    const link = article?.link ?? '';
    const favicon = 'https://s2.googleusercontent.com/s2/favicons?domain=' + link.split('/')[2] + '&sz=256' ?? '';
    return (
        // <HoverMenuLink className="textualHoverMenu articleHoverMenu" href={article?.link ?? ''} menu={(
        //     <div className="textualIcon">
        //         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M218.87-135.87q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-522.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26H480v83H218.87v522.26h522.26V-480h83v261.13q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H218.87ZM394.41-336 336-394.41l346.72-346.72H576v-83h248.13V-576h-83v-106.72L394.41-336Z" /></svg>
        //     </div>
        // )}>
        //     {children}
        // </HoverMenuLink >
        <HoverMenuLink className="textualHoverMenu articleHoverMenu" href={article?.link ?? ''} menu={(
            <>
                <div className="textualIcon">
                    <Image src={favicon} alt='' fill></Image>
                </div>
                <div className="textualIcon" title='Open Artist Page'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#FFFFFF"><path d="M218.87-135.87q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-522.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26H480v83H218.87v522.26h522.26V-480h83v261.13q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H218.87ZM394.41-336 336-394.41l346.72-346.72H576v-83h248.13V-576h-83v-106.72L394.41-336Z" /></svg>
                </div>
            </>
        )}>
            {children}
        </HoverMenuLink >
    )
}