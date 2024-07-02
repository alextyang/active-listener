"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessToken, IRedirectionStrategy, IValidateResponses, PlaybackState, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import PlayerPage from "./player/player";
import { SpotifyClientContext } from "./context";
import Footer from "./components/footer";

const SLOW_REQUEST_DELAY = 5 * 1000;
const REDIRECT_URI = process.env.NODE_ENV == 'production' ? 'https://songbuddy.alexya.ng' : 'http://localhost:3000/';
const CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';


export default function Home() {
  const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const [playlists, setPlaylists] = useState<UserProfile | undefined>(undefined);

  const router = useRouter();

  const logout = useCallback(() => {
    if (!spotifyClient) return;

    spotifyClient.logOut();
    setSpotifyClient(undefined);

    router.push('/');
  }, [router, spotifyClient]);

  const login = useCallback(async () => {
    console.log('[AUTH] Attempting Spotify client connection...');
    logout();

    // React-specific redirect strategy
    class DocumentLocationRedirectionStrategy implements IRedirectionStrategy {
      router: AppRouterInstance;
      constructor(router: AppRouterInstance) {
        this.router = router;
      }

      public async redirect(targetUrl: string | URL): Promise<void> {
        console.log(targetUrl);
        router.push(targetUrl.toString());
      }

      public async onReturnFromRedirect(): Promise<void> {
      }
    }

    const beforeRequest = (str: string, req: RequestInit) => {
      // console.log('[SPOTIFY-SDK] Trying request: ', str, req);
    }

    const afterRequest = (str: string, req: RequestInit, res: Response) => {
      // res.clone().text().then((data) => {
      //   // console.log('[SPOTIFY-SDK] Made request: ', str, req, res, data);
      // });
      // return;
    }

    // Attempt a Spotify Client login
    let newClient = undefined;

    try {
      newClient = SpotifyApi.withUserAuthorization(CLIENT_ID, REDIRECT_URI, ['user-read-currently-playing', 'user-modify-playback-state', 'user-read-playback-state', 'user-library-read', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative'], { redirectionStrategy: new DocumentLocationRedirectionStrategy(router), beforeRequest: beforeRequest, afterRequest: afterRequest });
    } catch (error) {
      console.log('[AUTH] Spotify client connection failed.');
    }

    console.log('[AUTH] Spotify client successfully connected.');

    if (newClient)
      setUserProfile(await newClient.currentUser.profile());

    setSpotifyClient(newClient);

  }, [REDIRECT_URI, logout, router]);

  // Try to login on page load
  useEffect(() => {
    if (spotifyClient === undefined) login();
  }, [login, spotifyClient]);

  return (
    <main className={''}>
      {spotifyClient ? (
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: login, logout: logout }}>
          <PlayerPage></PlayerPage>
          <Footer></Footer>
        </SpotifyClientContext.Provider>
      ) : ''}
    </main>
  );
}
