"use client";

import { TrackContextObject, TrackSyncState, TrackContext, TrackSyncContext, LibrarySyncContext } from "@/app/(domain)/app/context";
import { useState, useEffect, useContext, useRef } from "react";
import PlaybackBackground from "../../../(components)/music/track/background";
import SongSearch from "../../../(components)/service/songSearch";
import TrackInfo from "../../../(components)/music/track/trackInfo";
import { fetchTrackContext } from "../actions";
import Profile from "@/app/(components)/service/profile";
import Link from "next/link";
import { Body } from "@/app/(components)/app/body";
import { ArticleList } from "@/app/(components)/app/articles/articleList";
import { ArticleProvider } from "@/app/(components)/app/articles/articleProvider";
import { SummaryCard } from "@/app/(components)/app/summary/summary";
import { SummaryProvider } from "@/app/(components)/app/summary/summaryProvider";
import LibraryContext from "@/app/(components)/player/libraryContext";
import { SubPlayerOverlay } from "@/app/(components)/player/playerOverlay";
import { TrackSyncMessage } from "@/app/(components)/player/trackSyncMessage";



export default function DemoPage({ params }: { params: { trackId: string } }) {
    const [trackContext, setTrackContext] = useState<TrackContextObject>(null);
    const [fetchState, setFetchState] = useState<TrackSyncState>({ state: 'track' });

    useEffect(() => {
        const action = fetchTrackContext.bind(null, params.trackId as string)

        setFetchState({ state: 'track' });
        action().then((track) => {
            setTrackContext(track ?? null);
            if (!track) setFetchState({ state: 'waiting' });
            else setFetchState({ state: 'track' });
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
                    <Body>
                        <SubPlayerOverlay />
                        <LibraryContext></LibraryContext>
                        <TrackSyncMessage></TrackSyncMessage>
                        <div className="journalism">
                            <ArticleProvider>
                                <SummaryProvider>
                                    <SummaryCard />
                                </SummaryProvider>
                                <ArticleList></ArticleList>
                            </ArticleProvider>
                        </div>
                    </Body>
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