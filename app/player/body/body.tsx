
import { ProgressContext, progressMessages, ProgressState } from "@/app/context";
import { Articles } from "./articles/articles";
import { useContext, useRef, useState } from "react";
import Link from "next/link";
import ControlIcons from "./components/controlIcons";
import GenreList from "./components/genres";
import { SpotifyLogoWhite } from "./components/spotifyLogo";
import Lyrics from "./lyrics/lyrics";

export function Body() {
    const fetchState = useContext(ProgressContext);

    return (
        <div className='body'>
            <div className="subPlayer">
                <GenreList>
                    <Link href={'spotify:'} title="Open Spotify App"><SpotifyLogoWhite></SpotifyLogoWhite></Link>
                </GenreList>
                <ControlIcons></ControlIcons>
            </div>
            <Loading state={fetchState.state}></Loading>
            <Lyrics></Lyrics>
            <Articles></Articles>
        </div>
    );
}


function Loading({ state }: { state: ProgressState }) {
    const message = progressMessages[state.state];
    const percentage = state.percent;

    return (
        <div className={"loading " + (message.length == 0 ? ' hidden ' : '') + (percentage && percentage !== -1 ? ' percentage ' : '')}>
            <div className="loadingText">{message}</div>
            {
                percentage && percentage !== -1 ? (
                    <div className="loadingBar">
                        <div className="loadingBarFill" style={{ width: percentage + '%' }}></div>
                    </div>
                ) : ('')
            }
        </div>
    );
}