import { CurrentTrackInfoContext } from "@/app/context";
import { useContext } from "react";
import Image from "next/image";


export default function TrackInfo() {
    const currentTrackInfo = useContext(CurrentTrackInfoContext);

    return (
        <div className="trackInfo">
            <div className="albumCover">
                {currentTrackInfo?.album.name ?
                    (
                        <Image src={currentTrackInfo?.album.images[0].url} alt={''} fill={true}></Image>
                    ) :
                    (<div className="placeholder"></div>)
                }
            </div>
            <div className="infoStack">
                <p className="songTitle">{currentTrackInfo?.track.name}</p>
                <p className="artistNames">{currentTrackInfo?.artists.map((artist) => artist.name).join(', ')}</p>
            </div>
        </div>
    )
}