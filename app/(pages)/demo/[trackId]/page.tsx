"use client";

import { TrackContextObject, ProgressState, TrackContext, ProgressContext, LibraryContext } from "@/app/(domain)/context";
import { useState, useEffect, useContext, useRef } from "react";
import { Body } from "../../(home)/body/body";
import PlaybackBackground from "../../(home)/components/background";
import SongSearch from "../../(home)/components/songSearch";
import TrackInfo from "../../(home)/components/trackInfo";
import { fetchTrackContext } from "../actions";
import Profile from "@/app/(components)/spotify/profile";
import Link from "next/link";



export default function DemoPage({ params }: { params: { trackId: string } }) {
    const [trackContext, setTrackContext] = useState<TrackContextObject>(null);
    const [fetchState, setFetchState] = useState<ProgressState>({ state: 'track', percent: -1 });

    useEffect(() => {
        const action = fetchTrackContext.bind(null, params.trackId as string)

        setFetchState({ state: 'track', percent: -1 });
        action().then((track) => {
            setTrackContext(track ?? null);
            if (!track) setFetchState({ state: 'no-track', percent: -1 });
            else setFetchState({ state: 'track', percent: -1 });
        });

    }, [params.trackId]);


    return (
        <main className={''}>
            <TrackContext.Provider value={trackContext}>
                <ProgressContext.Provider value={{ update: setFetchState, state: fetchState }}>
                    <div className="player">
                        <PlaybackBackground />
                        <TrackInfo></TrackInfo>
                        <SongSearch></SongSearch>
                    </div>
                    <Body></Body>
                </ ProgressContext.Provider>
                <Footer></Footer>
            </TrackContext.Provider>
        </main>
    );
}

function Footer() {
    const libraryFetchState = useContext(LibraryContext);
    const message = useRef<string>('');

    if (libraryFetchState.state.state === 'done') message.current = ('Library loaded.');
    else if (libraryFetchState.state.state === 'library') message.current = ('Syncing library...');
    else if (libraryFetchState.state.state === 'playlists') message.current = ('Syncing playlists... (' + libraryFetchState.state.percent + '%)');

    return (
        <div className="footer">
            <div className="footerLinks">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/about">About</Link>
            </div>
            <div className="footerMessage">
                {message.current}
            </div>
            <Profile></Profile>
        </div>
    )
}