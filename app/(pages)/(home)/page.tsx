"use client";

import Intro from "../intro/intro";
import { ClientProvider } from "@/app/(components)/service/clientProvider";
import { Footer } from "@/app/(components)/site/footer";
import { PlayerProvider } from "@/app/(components)/player/playerProvider";
import { PlayerOverlay, SubPlayerOverlay } from "@/app/(components)/player/playerOverlay";
import { Body } from "@/app/(components)/app/body";
import LibraryContext from "@/app/(components)/player/libraryContext";
import { TrackSyncMessage } from "@/app/(components)/player/trackSyncMessage";
import { ArticleList } from "@/app/(components)/app/articles/articleList";
import { ArticleProvider } from "@/app/(components)/app/articles/articleProvider";
import { SummaryProvider } from "@/app/(components)/app/summary/summaryProvider";
import { SummaryCard } from "@/app/(components)/app/summary/summary";

export default function Page() {
  return (
    <main className={''}>
      <ClientProvider loginPage={(<Intro />)}>
        <PlayerProvider>
          <PlayerOverlay />
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
        </PlayerProvider>
        <Footer />
      </ClientProvider>
    </main>
  )
}

