
import { TrackFetchContext, TrackFetchState } from "@/app/context";
import { Articles } from "./articles/articles";
import { useContext, useRef, useState } from "react";
import Link from "next/link";
import ControlIcons from "./components/controlIcons";
import GenreList from "./components/genres";
import { SpotifyLogoWhite } from "./components/spotifyLogo";

export function Body() {
    const fetchState = useContext(TrackFetchContext);
    const message = useRef<string>('');

    if (fetchState.state.state === 'no-track')
        message.current = '';

    else if (fetchState.state.state === 'track')
        message.current = ('Getting track information...');

    else if (fetchState.state.state === 'articles')
        message.current = ('Finding reviews for track...');

    else if (fetchState.state.state === 'summary')
        message.current = 'Generating summary...';

    else if (fetchState.state.state === 'done')
        message.current = '';

    return (
        <div className='body'>
            <div className="subPlayer">
                <GenreList>
                    <Link href={'spotify:'} title="Open Spotify App"><SpotifyLogoWhite></SpotifyLogoWhite></Link>
                </GenreList>
                <ControlIcons></ControlIcons>
            </div>
            <Loading message={message.current} percentage={fetchState.state.percent}></Loading>
            <Articles></Articles>
        </div>
    );
}

function Loading({ message, percentage }: { message: string, percentage: number }) {
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