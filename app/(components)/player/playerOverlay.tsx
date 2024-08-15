import Link from "next/link";
import PlaybackBackground from "../music/track/background";
import GenreList from "../music/track/genreList";
import TrackInfo from "../music/track/track";
import { SpotifyLogoWhite } from "../service/spotifyLogo";
import ControlIcons from "./controls/controlIcons";
import Controls from "./controls/controls";
import Timeline from "./controls/timeline";

export function PlayerOverlay() {
    return (
        <div className="player">
            <PlaybackBackground />
            <TrackInfo />
            <Timeline />
            <Controls />
        </div>
    )
}

export function SubPlayerOverlay() {
    return (
        <div className="subPlayer">
            <GenreList>
                <Link href={'spotify:'} title="Open Spotify App"><SpotifyLogoWhite></SpotifyLogoWhite></Link>
            </GenreList>
            <ControlIcons></ControlIcons>
        </div>
    )
}