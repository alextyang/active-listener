import { CurrentTrackInfoContext } from "@/app/context";
import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import Vibrant from "node-vibrant";
import { Vec3 } from "node-vibrant/lib/color";


export default function PhotoCard({
    children, src, className
}: {
    children: React.ReactNode, src?: string, className?: string
}) {
    const [colorExtract, setColorExtract] = useState<Vec3>([51, 51, 51]);

    useEffect(() => {
        if (!src) return;
        Vibrant.from(src).getPalette().then((palette) => {
            setColorExtract(palette.Muted?.getRgb() ?? [51, 51, 51]);
        });
    }, [src]);

    return (
        <div className={"photoCard " + className} >
            <div className="photoCardOverlay" style={{ backgroundColor: `rgb(${colorExtract[0]}, ${colorExtract[1]}, ${colorExtract[2]}, 0.6)` }}></div>
            <Image className="photoCardPhoto" src={src ?? ''} alt="" fill={true}></Image>
            {children}
        </div>
    )
}