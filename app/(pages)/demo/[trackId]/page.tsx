"use client";

import { TrackContextObject, TrackSyncState, TrackContext, TrackSyncContext, LibrarySyncContext } from "@/app/(domain)/app/context";
import { useState, useEffect, useContext, useRef } from "react";
import { Body } from "../../(home)/body/body";
import PlaybackBackground from "../../../(components)/music/track/background";
import SongSearch from "../../../(components)/service/songSearch";
import TrackInfo from "../../../(components)/music/track/track";
import { fetchTrackContext } from "../actions";
import Profile from "@/app/(components)/service/profile";
import Link from "next/link";



export default function DemoPage({ params }: { params: { trackId: string } }) {
    const [trackContext, setTrackContext] = useState<TrackContextObject>(null);
    const [fetchState, setFetchState] = useState<TrackSyncState>({ state: 'track', percent: -1 });

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
                <TrackSyncContext.Provider value={{ update: setFetchState, state: fetchState }}>
                    <div className="player">
                        <PlaybackBackground />
                        <TrackInfo></TrackInfo>
                        <SongSearch></SongSearch>
                    </div>
                    <Body></Body>
                </ TrackSyncContext.Provider>
                <Footer></Footer>
            </TrackContext.Provider>
        </main>
    );
}

function Footer() {
    return (
        <div className="footer">
            <div className="footerLinks">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/about">About</Link>
            </div>
            <Profile></Profile>
        </div>
    )
}