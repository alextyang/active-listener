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
import { Summary } from "./articles/summary/summary";
import { ArticleProvider } from "@/app/(components)/app/articles/articleProvider";

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
                <Summary ></Summary>
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

