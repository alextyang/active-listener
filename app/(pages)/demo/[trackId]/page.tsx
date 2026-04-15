"use client";

import PlayerBackground from "../../../(components)/music/track/background";
import SongSearch from "../../../(components)/service/songSearch";
import CurrentTrackInfo from "../../../(components)/music/track/currentTrackInfo";
import Profile from "@/app/(components)/service/profile";
import Link from "next/link";
import { Body } from "@/app/(components)/app/body";
import { ArticleList } from "@/app/(components)/app/articles/articleList";
import { SubPlayerOverlay } from "@/app/(components)/player/playerOverlay";
import { TrackSyncMessage } from "@/app/(components)/player/trackSyncMessage";
import { SummaryCard } from "@/app/(components)/app/summary/summaryCard";
import PlaylistList from "@/app/(components)/player/playlistList";
import { TrackRuntimeProvider } from "@/app/(components)/app/trackRuntimeProvider";
import { use } from "react";

export default function DemoPage({ params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = use(params);

    return (
        <main className={''}>
            <TrackRuntimeProvider trackId={trackId}>
                    <div className="player">
                        <PlayerBackground />
                        <CurrentTrackInfo></CurrentTrackInfo>
                        <SongSearch></SongSearch>
                    </div>
                    <Body>
                        <SubPlayerOverlay />
                        <PlaylistList></PlaylistList>
                        <TrackSyncMessage></TrackSyncMessage>
                        <div className="journalism">
                            <SummaryCard />
                            <ArticleList></ArticleList>
                        </div>
                    </Body>
                </TrackRuntimeProvider>
                <Footer></Footer>
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
