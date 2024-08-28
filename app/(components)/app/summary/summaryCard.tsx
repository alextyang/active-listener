import { useContext } from "react";
import Image from "next/image";
import { SummaryContext, TrackContext } from "@/app/(domain)/app/context";
import { SUMMARY_IMAGE_SIZES } from "@/app/(domain)/app/config";
import { getSummaryOverlayColor } from "@/app/(domain)/app/summary/summary";
import { SummaryIcon } from "../../icons";

export function SummaryCard() {
    const summary = useContext(SummaryContext).summary;
    const track = useContext(TrackContext);

    const hasImage = track?.album?.images[0]?.url ? true : false;
    const src = track?.album?.images[0]?.url;

    const summaryOverlayColor = getSummaryOverlayColor(track);
    const cardStyles = { '--overlay-color': summaryOverlayColor } as React.CSSProperties;
    const overlayStyles = { backgroundColor: summaryOverlayColor };

    return (
        <div className={"summaryCard"} style={cardStyles}>
            <div className="summaryIcon">
                <SummaryIcon />
            </div>
            <div className="summary">
                {summary}
            </div>
            <div className="summaryCardOverlay" style={overlayStyles}></div>
            {hasImage ? (
                <Image className="summaryCardPhoto" src={src ?? ''} alt="" fill={true} sizes={SUMMARY_IMAGE_SIZES}></Image>
            ) : (
                <div className="summaryCardPhoto"></div>
            )}
        </div>
    )
}