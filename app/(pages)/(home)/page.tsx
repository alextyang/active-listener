"use client";

import Intro from "../intro/intro";
import { ClientProvider } from "@/app/(components)/service/clientProvider";
import { Footer } from "@/app/(components)/site/footer";
import { PlayerProvider } from "@/app/(components)/player/playerProvider";
import { PlayerOverlay, SubPlayerOverlay } from "@/app/(components)/player/playerOverlay";
import { Body } from "@/app/(components)/app/body";
import { TrackSyncMessage } from "@/app/(components)/player/trackSyncMessage";
import { ArticleList } from "@/app/(components)/app/articles/articleList";
import { ArticleProvider } from "@/app/(components)/app/articles/articleProvider";
import { SummaryProvider } from "@/app/(components)/app/summary/summaryProvider";
import { SummaryCard } from "@/app/(components)/app/summary/summaryCard";
import { QueueProvider } from "@/app/(components)/player/queueProvider";
import PlaylistList from "@/app/(components)/player/playlistList";

export default function Page() {
  return (
    <main className={''}>
      <ClientProvider loginPage={(<Intro />)}>
        <PlayerProvider>
          <QueueProvider>
            <PlayerOverlay />
            <Body>
              <SubPlayerOverlay />
              <PlaylistList />
              <TrackSyncMessage />
              <div className="journalism">
                <ArticleProvider>
                  <SummaryProvider>
                    <SummaryCard />
                  </SummaryProvider>
                  <ArticleList />
                </ArticleProvider>
              </div>
            </Body>
          </QueueProvider>
        </PlayerProvider>
        <Footer />
      </ClientProvider>
    </main>
  )
}

