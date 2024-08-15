import ScrollOverflow from "@/app/(components)/utilities/scrollOverflow";
import { SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";
import Link from "next/link";
import Image from "next/image";

export function PlaylistInfo({ playlist }: { playlist: SimplifiedPlaylist }) {
    return (
        <div className={'playlistInfo'}>
            <div className='albumWrapper'>
                <Link className="cardBackground" href={playlist.uri}></Link>
                <Image className='albumCover' src={playlist.images[0].url} alt={playlist.name} width={128} height={128} />
            </div>
            <div className="infoStack">
                <ScrollOverflow>
                    <Link className='title' href={playlist.uri}>{playlist.name}</Link>
                </ScrollOverflow>
                <ScrollOverflow>
                    <Link className='owner' href={playlist.owner.uri}>{playlist.owner.display_name}</Link>
                </ScrollOverflow>

            </div>
        </div>
    );
}