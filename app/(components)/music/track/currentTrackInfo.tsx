import { TrackContext } from "@/app/(domain)/app/context";
import { useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollOverflow from "@/app/(components)/utilities/scrollOverflow";
import { NP_ALBUM_SIZES } from "@/app/(domain)/app/config";
import { ArtistLink } from "./track";


export default function CurrentTrackInfo() {
    const track = useContext(TrackContext)?.track;

    const hasTrack = track !== null && track !== undefined;
    const key = 'nowPlaying';

    // track
    const trackHref = track?.uri ?? '';
    const trackName = track?.name ?? '';

    // album
    const albumHref = track?.album.uri ?? '';
    const albumKey = track?.album.uri + key;
    const albumCover = track?.album.images[0].url ?? '';
    const albumSizes = NP_ALBUM_SIZES;

    // artists
    const artists = track?.artists ?? [];

    return (
        <div className="trackInfo">
            {hasTrack ?
                (
                    <Link className="albumCover" href={albumHref} key={albumKey}>
                        <Image src={albumCover} alt={''} fill={true} sizes={albumSizes} priority></Image>
                    </Link>
                ) :
                (
                    <div className="albumPlaceholder" key={'albumPlaceholder'}></div>
                )
            }
            <div className="infoStack">
                <ScrollOverflow>
                    <Link href={trackHref} className="songTitle">{trackName}</Link>
                </ScrollOverflow>

                <ScrollOverflow>
                    <div className="artistNames">
                        {artists.map((artist, index) => ArtistLink({ artist, index, key }))}
                    </div>
                </ScrollOverflow>
            </div>
        </div>
    )
}

