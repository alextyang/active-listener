import { TrackContext } from "@/app/context";
import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import Vibrant from "node-vibrant";



export default function PlaybackBackground() {
    const currentTrackInfo = useContext(TrackContext);
    const [colorExtracts, setColorExtracts] = useState<string[]>(['#333', '#333']);

    useEffect(() => {
        const url = currentTrackInfo?.track.album.images[0].url;
        if (!url) return;

        Vibrant.from(url).getPalette().then((palette) => {
            const pick: string[] = [palette.Muted?.getHex() ?? '#333', palette.Vibrant?.getHex() ?? '#333'];
            setColorExtracts(pick);
        });


    }, [currentTrackInfo]);

    return (
        <div className="playbackBackground" style={{ background: `linear-gradient(64deg, ${colorExtracts[0]}, ${colorExtracts[1]})` }}>
        </div>
    )
}