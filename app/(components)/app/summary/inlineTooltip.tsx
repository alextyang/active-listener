
import { Album, Artist, SimplifiedTrack, Track } from "@spotify/web-api-ts-sdk";
import Image from "next/image";
import { useContext, useState } from "react";
import { TrackContext, PlaybackContext, SpotifyClientContext, ActionContext } from "../../../(domain)/app/context";
import { CompleteArticle } from "../../../(domain)/app/types";
import { HoverMenuLink, HoverMenu } from "../../utilities/hoverMenu";
import { AddedToQueueIcon, AddToQueueIcon, ExternalLinkIcon, SmallPauseIcon, SmallPlayIcon } from "../../icons";
import { getFaviconUrl } from "@/app/(domain)/utilities/fetch";


export function InlineArtistTooltip({ artist, children }: { artist?: Artist, children: React.ReactNode }) {
    if (!artist?.uri) return <>{children}</>;

    const artistImage = artist.images[0]?.url;
    const href = artist.uri ?? '';
    const hoverText = 'Open Artist in Spotify';

    return (
        <InlineTooltip className={'artistHoverMenu'} action={href} hoverText={hoverText} src={artistImage} icon={<ExternalLinkIcon />} >
            {children}
        </InlineTooltip>
    )
}

export function InlineAlbumTooltip({ album, children }: { album?: Album, children: React.ReactNode }) {
    if (!album?.uri) return <>{children}</>;

    const albumImage = album.images[0]?.url;
    const href = album.uri;
    const hoverText = 'Open Album in Spotify';

    return (
        <InlineTooltip className={'albumHoverMenu'} action={href} hoverText={hoverText} src={albumImage} icon={<ExternalLinkIcon />} >
            {children}
        </InlineTooltip>
    )
}

export function InlineArticleTooltip({ article, children }: { article: CompleteArticle, children: React.ReactNode }) {
    if (!article?.link) return <>{children}</>;

    const href = article.link;
    const faviconSrc = getFaviconUrl(href);
    const hoverText = 'Open Article in New Tab';

    return (
        <InlineTooltip className={'articleHoverMenu'} action={href} hoverText={hoverText} src={faviconSrc} icon={<ExternalLinkIcon />} >
            {children}
        </InlineTooltip>
    )
}

export function InlineTrackTooltip({ track, children }: { track: Track | SimplifiedTrack, children: React.ReactNode }) {
    const currentTrack = useContext(TrackContext);
    const playback = useContext(PlaybackContext);
    const client = useContext(SpotifyClientContext);
    const actions = useContext(ActionContext);

    const [isSuccessful, setIsSuccessful] = useState(false);

    const isOffline = !client.api;
    const isNowPlaying = currentTrack?.track?.id === track.id;
    const albumImage = (track as Track).album.images[0]?.url ?? currentTrack?.track?.album.images[0]?.url ?? '';

    if (isOffline) {
        const href = track.uri;
        const hoverText = 'Open Song in Spotify';

        return (
            <InlineTooltip className={'albumHoverMenu'} action={href} hoverText={hoverText} src={albumImage} icon={<ExternalLinkIcon />} >
                {children}
            </InlineTooltip>
        )
    }
    else if (isNowPlaying) {
        const isPlaying = playback?.playbackState?.is_playing ?? false;
        const hoverText = isPlaying ? 'Pause Playback' : 'Resume Playback';
        const action = actions.togglePlayback;
        const icon = isPlaying ? (<SmallPauseIcon />) : (<SmallPlayIcon />);

        return (
            <InlineTooltip className={'trackHoverMenu'} action={action} hoverText={hoverText} src={albumImage} icon={icon} >
                {children}
            </InlineTooltip>
        )
    }
    else {
        const hoverText = isSuccessful ? 'Added to Queue' : 'Add to Queue';
        const icon = isSuccessful ? (<AddedToQueueIcon />) : (<AddToQueueIcon />);
        const action = () => {
            client.api?.player.addItemToPlaybackQueue(track.uri);
            setIsSuccessful(true);
        }

        return (
            <InlineTooltip className={'trackHoverMenu'} action={action} hoverText={hoverText} src={albumImage} icon={icon} >
                {children}
            </InlineTooltip>
        )
    }
}


function InlineTooltip({ children, className, action, hoverText, src, icon }: { children: React.ReactNode, className: string, action: string | (() => void), hoverText: string, src?: string, icon: React.ReactNode }) {
    if (typeof action === 'string')
        return (
            <HoverMenuLink className={"textualHoverMenu " + className} href={action} menu={(
                <>
                    <div className="textualIcon">
                        {src ?
                            <Image src={src} alt='' fill sizes="5vw" className="image"></Image> :
                            <div className="image placeholderImage"> </div>
                        }
                    </div>
                    <div className="textualIcon" title={hoverText}>
                        {icon}
                    </div>
                </>
            )}>
                {children}
            </HoverMenuLink >
        )
    else
        return (
            <HoverMenu className={"textualHoverMenu " + className} onClick={action} menu={(
                <>
                    <div className="textualIcon">
                        {src ?
                            <Image src={src} alt='' fill sizes="5vw" className="image"></Image> :
                            <div className="image placeholderImage"> </div>
                        }
                    </div>
                    <div className="textualIcon" title={hoverText}>
                        {icon}
                    </div>
                </>
            )}>
                {children}
            </HoverMenu >
        )
}