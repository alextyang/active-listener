"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { AccessToken, IRedirectionStrategy, PlaybackState, SpotifyApi } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import PlayerPage from "./player/player";
import { SpotifyClientContext } from "./context";



export default function Home() {

  // AUTHENTICATION
  const REDIRECT_URI = process.env.URL ?? window.location.href;
  const CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';
  const OAUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURI(REDIRECT_URI)}&response_type=token`;

  const [accessToken, setAccessToken] = useState<AccessToken | null>(null);
  const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | null>(null);

  const router = useRouter();

  useEffect(() => {
    // React-specific redirect strategy
    class DocumentLocationRedirectionStrategy implements IRedirectionStrategy {
      router: AppRouterInstance;
      constructor(router: AppRouterInstance) {
        this.router = router;
      }

      public async redirect(targetUrl: string | URL): Promise<void> {
        console.log(router);
        router.push(targetUrl.toString());
      }

      public async onReturnFromRedirect(): Promise<void> {
      }
    }

    // Attempt a Spotify Client login
    if (spotifyClient === null) {
      let newClient = null;

      try {
        newClient = SpotifyApi.withUserAuthorization(CLIENT_ID, REDIRECT_URI, ['user-read-currently-playing', 'user-modify-playback-state', 'user-library-read'], { redirectionStrategy: new DocumentLocationRedirectionStrategy(router) });
      } catch (error) {
        console.log('[AUTH] Spotify client connection failed.');
      }

      if (newClient)
        newClient.currentUser.profile().then((profile) => {
          console.log('[AUTH] Spotify client successfully connected.', profile);
        });

      setSpotifyClient(newClient);

    }
  }, [spotifyClient, accessToken, router])

  return (
    <main className={''}>
      <SpotifyClientContext.Provider value={spotifyClient}>
        <PlayerPage></PlayerPage>
      </SpotifyClientContext.Provider>
    </main>
  );
}
