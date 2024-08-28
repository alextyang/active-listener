import ScrollOverflow from "@/app/(components)/utilities/scrollOverflow";
import { SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";
import Link from "next/link";
import Image from "next/image";
import { PLAYLIST_COVER_QUALITY } from "@/app/(domain)/app/config";

export function PlaylistCard({ playlist }: { playlist: SimplifiedPlaylist }) {
    const playlistHref = playlist.uri;
    const playlistName = playlist.name;
    const ownerName = playlist.owner.display_name;
    const ownerHref = playlist.owner.uri;

    const playlistCover = playlist.images[0].url;
    const playlistAlt = playlistName;
    const playlistCoverQuality = PLAYLIST_COVER_QUALITY;

    return (
        <div className={'playlistInfo'}>
            <div className='albumWrapper'>
                <Link className="cardBackground" href={playlistHref}></Link>
                <Image className='albumCover' src={playlistCover} alt={playlistAlt} width={playlistCoverQuality} height={playlistCoverQuality} />
            </div>
            <div className="infoStack">
                <ScrollOverflow>
                    <Link className='title' href={playlistHref}>{playlistName}</Link>
                </ScrollOverflow>
                <ScrollOverflow>
                    <Link className='owner' href={ownerHref}>{ownerName}</Link>
                </ScrollOverflow>
            </div>
        </div>
    );
}