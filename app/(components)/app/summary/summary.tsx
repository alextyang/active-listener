import { use, useContext, useEffect, useState } from "react";
import Image from "next/image";
import Vibrant from "node-vibrant";
import { Vec3 } from "node-vibrant/lib/color";
import { SummaryContext, TrackContext } from "@/app/(domain)/app/context";



export function SummaryCard({
    className
}: {
    className?: string
}) {
    const summary = useContext(SummaryContext).summary;
    const track = useContext(TrackContext);
    const src = track?.track?.album.images[0].url;

    const [colorExtract, setColorExtract] = useState<Vec3>([51, 51, 51]);

    useEffect(() => {
        if (!src) return;
        Vibrant.from(src).getPalette().then((palette) => {
            setColorExtract(palette.Muted?.getRgb() ?? [51, 51, 51]);
        });
    }, [src]);

    return (
        <div className={"summaryCard " + className} style={{ '--overlay-color': `rgb(${colorExtract[0]}, ${colorExtract[1]}, ${colorExtract[2]}, 0.6)` } as React.CSSProperties}>
            <div className="summaryIcon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#FFFFFF" strokeWidth="2"><path d="M8 15C12.8747 15 15 12.949 15 8C15 12.949 17.1104 15 22 15C17.1104 15 15 17.1104 15 22C15 17.1104 12.8747 15 8 15Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"></path><path d="M2 6.5C5.13376 6.5 6.5 5.18153 6.5 2C6.5 5.18153 7.85669 6.5 11 6.5C7.85669 6.5 6.5 7.85669 6.5 11C6.5 7.85669 5.13376 6.5 2 6.5Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"></path></svg>
            </div>
            <div className="summary">
                {summary}
            </div>

            <div className="summaryCardOverlay" style={{ backgroundColor: `rgb(${colorExtract[0]}, ${colorExtract[1]}, ${colorExtract[2]}, 0.6)` }}>
            </div>
            <Image className="summaryCardPhoto" src={src ?? ''} alt="" fill={true}></Image>

        </div>
    )
}