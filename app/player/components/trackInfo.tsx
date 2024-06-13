import { TrackContext } from "@/app/context";
import { useContext } from "react";
import Image from "next/image";


export default function TrackInfo() {
    const currentTrackInfo = useContext(TrackContext);

    return (
        <div className="trackInfo">
            <div className="albumCover">
                {currentTrackInfo?.track.album.name ?
                    (
                        <Image src={currentTrackInfo?.track.album.images[0].url} alt={''} fill={true}></Image>
                    ) :
                    (<div className="placeholder"></div>)
                }
            </div>
            <div className="infoStack">
                <p className="songTitle">{currentTrackInfo?.track.name}</p>
                <p className="artistNames">{currentTrackInfo?.track.artists.map((artist) => artist.name).join(', ')}</p>
            </div>
        </div>
    )
}