"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import PlayerPage from "./player";
import { LibraryContext, LibraryState, PlaylistContext, PlaylistDict, SpotifyClientContext } from "../../(domain)/context";
import Intro from "../intro/intro";
import { shouldAutoLogin, trySpotifyLogin, trySpotifyLogout } from "@/app/(domain)/spotify/account";
import { getUserProfile } from "@/app/(domain)/spotify/profile";
import { syncUserPlaylists } from "@/app/(domain)/spotify/library";
import { Footer } from "@/app/(components)/player/footer";


export default function Home() {
  const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const [playlistDict, setPlaylistDict] = useState<PlaylistDict | undefined>(undefined);
  const [libraryState, setLibraryState] = useState<LibraryState>({ state: 'no-library', percent: -1 });

  const router = useRouter();

  const handleLogin = useCallback(() => {
    setSpotifyClient(trySpotifyLogin(router));
  }, [router]);

  const handleLogout = useCallback(() => {
    trySpotifyLogout(spotifyClient, setSpotifyClient, router);
  }, [spotifyClient, router]);

  const handleLibraryStateChange = useCallback((state: LibraryState) => {
    setLibraryState(state);
  }, []);

  const handleLibrarySync = useCallback(() => {
    syncUserPlaylists(spotifyClient, libraryState, handleLibraryStateChange).then((dict) => {
      setPlaylistDict(dict);
    });
  }, [handleLibraryStateChange, libraryState, spotifyClient]);


  // Auto-login on page load
  useEffect(() => {
    if (shouldAutoLogin(spotifyClient))
      handleLogin();
  }, [handleLogin, spotifyClient]);

  // Update profile on login
  useEffect(() => {
    getUserProfile(spotifyClient).then(setUserProfile);
  }, [spotifyClient]);


  // Download playlists in background
  useEffect(() => {
    handleLibrarySync();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyClient]);



  if (spotifyClient)
    return (
      <main className={''}>
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: handleLogin, logout: handleLogout }}>
          <PlaylistContext.Provider value={{ playlistDict: playlistDict }}>
            <PlayerPage></PlayerPage>
            <LibraryContext.Provider value={{ state: libraryState, requestUpdate: handleLibrarySync }}>
              <Footer></Footer>
            </LibraryContext.Provider>
          </PlaylistContext.Provider>
        </SpotifyClientContext.Provider>
      </main>
    )
  else
    return (
      <main className={''}>
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: handleLogin, logout: handleLogout }}>
          <Intro />
          <Footer></Footer>
        </SpotifyClientContext.Provider>
      </main>
    );
}

