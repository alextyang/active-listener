"use client";

import Footer from "@/app/components/footer";
import { TrackContext, TrackContextObject, ProgressContext, ProgressState } from "@/app/context";
import PlayerPage from "@/app/player/player";
import { useRouter } from 'next/router'
import { useEffect, useState } from "react";
import { fetchTrackContext } from "../actions";
import { Body } from "../../player/body/body";
import PlaybackBackground from "../../player/components/background";
import Controls from "../../player/components/controls";
import SongSearch from "../../player/components/songSearch";
import Timeline from "../../player/components/timeline";
import TrackInfo from "../../player/components/trackInfo";


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
