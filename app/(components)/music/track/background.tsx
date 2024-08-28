import { TrackContext } from "@/app/(domain)/app/context";
import { useContext } from "react";
import { getPlayerGradient } from "@/app/(domain)/spotify/metadata";

export default function PlayerBackground() {
    const trackContext = useContext(TrackContext);

    const playerGradient = getPlayerGradient(trackContext);
    const bgStyle = { background: playerGradient };

    return (
        <div className="playbackBackground" style={bgStyle} />
    )
}