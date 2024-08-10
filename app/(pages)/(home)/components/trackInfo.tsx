import { ActionContext, PlaybackContext, TrackContext } from "@/app/(domain)/context";
import { use, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollOverflow from "@/app/(components)/utilities/scrollOverflow";


export default function TrackInfo() {
    const currentTrackInfo = useContext(TrackContext);

    return (
        <div className="trackInfo">
            {currentTrackInfo?.track?.album.name ?
                (
                    <Link className="albumCover" href={currentTrackInfo?.track?.album.uri}>
                        <Image src={currentTrackInfo?.track.album.images[0].url} alt={''} fill={true} sizes="10vw" priority></Image>
                    </Link>

                ) :
                (<div className="albumPlaceholder">
                </div>)
            }
            <div className="infoStack">
                <ScrollOverflow>
                    <Link href={currentTrackInfo?.track?.uri ?? ''} className="songTitle">{currentTrackInfo?.track?.name}</Link>
                </ScrollOverflow>

                <ScrollOverflow>
                    <div className="artistNames">
                        {currentTrackInfo?.track?.artists.map((artist, index) => {
                            const separator = index === 0 ? '' : ', ';
                            return (
                                <>
                                    <p key={artist.uri + 'name'} className="artistName">{separator}</p>
                                    <Link key={artist.uri} href={artist.uri} className="artistName">{artist.name}</Link>
                                </>
                            )
                        })}
                    </div>
                </ScrollOverflow>
            </div>
        </div>
    )
}