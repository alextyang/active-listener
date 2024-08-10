"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessToken, IRedirectionStrategy, IValidateResponses, Page, PlaybackState, Playlist, SimplifiedPlaylist, SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/dist/client/components/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import PlayerPage from "./player/player";
import { LibraryFetchContext, LibraryFetchState, PlaylistContext, PlaylistTrackDict, PlaylistIDDict, SpotifyClientContext } from "./context";
import Footer from "./components/footer";
import Intro from "./intro/intro";
import LyricsTest from "./player/body/lyrics/lyrics";
import { loadUsersPlaylists, saveUsersPlaylists } from "./storage";

const SLOW_REQUEST_DELAY = 1 * 100;
const MAX_PLAYLISTS = 1000;
const REDIRECT_URI = process.env.NODE_ENV == 'production' ? 'https://activelistener.alexya.ng/' : 'http://localhost:3000/';
const CLIENT_ID = 'b0947280bc0540fcbc59062db29a52c0';


export default function Home() {
  const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const [playlistTrackDict, setPlaylistTrackDict] = useState<PlaylistTrackDict | undefined>({});
  const [playlistIDDict, setPlaylistIDDict] = useState<PlaylistIDDict | undefined>({});

  const [libraryFetchState, setLibraryFetchState] = useState<LibraryFetchState>({ state: 'no-library', percent: -1 });

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

    // Attempt a Spotify Client login
    let newClient = undefined;

    try {
      newClient = SpotifyApi.withUserAuthorization(CLIENT_ID, REDIRECT_URI, ['user-read-currently-playing', 'user-modify-playback-state', 'user-read-playback-state', 'user-library-read', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative'], { redirectionStrategy: new DocumentLocationRedirectionStrategy(router) });
    } catch (error) {
      console.log('[AUTH] Spotify client connection failed.');
    }

    console.log('[AUTH] Spotify client successfully connected.');

    if (newClient)
      setUserProfile(await newClient.currentUser.profile());

    setSpotifyClient(newClient);

  }, [REDIRECT_URI, logout, router]);


  // Download playlists in background
  useEffect(() => {
    if (!spotifyClient || !userProfile) return;
    if (Object.keys(playlistIDDict ?? {}).length !== 0) return;
    if (libraryFetchState.state !== 'no-library') return;

    const sync = async () => {
      if (!spotifyClient || !userProfile) return;
      if (Object.keys(playlistIDDict ?? {}).length !== 0) return;
      if (libraryFetchState.state !== 'no-library') return;


      const cachedPlaylistDict = await loadUsersPlaylists(userProfile.id);
      console.log('[SYNC] Loaded playlist dict:', cachedPlaylistDict);

      if (cachedPlaylistDict) {
        setPlaylistTrackDict(cachedPlaylistDict.playlistTrackDict);
        setPlaylistIDDict(cachedPlaylistDict.playlistIDDict);
        setLibraryFetchState({ state: 'done', percent: -1 });
        return; // TODO update based on snapshot age
      }

      console.log('[SYNC] Starting library sync...');

      setLibraryFetchState({ state: 'library', percent: -1 });
      let playlistPage: Page<SimplifiedPlaylist>[] = [await spotifyClient.currentUser.playlists.playlists(50)];
      const playlists = playlistPage[0].items;

      while (playlistPage[playlistPage.length - 1].next) {
        console.log('[SYNC] Downloading library list...', playlists);

        await new Promise((resolve) => setTimeout(resolve, SLOW_REQUEST_DELAY));
        playlistPage.push(await spotifyClient.currentUser.playlists.playlists(50, 50 * playlistPage.length));
        playlists.push(...playlistPage[playlistPage.length - 1].items);
      }

      const workingIDDict: PlaylistIDDict = {};
      const workingTrackDict: PlaylistTrackDict = {};

      if (playlists.length > MAX_PLAYLISTS) {
        console.log('[SYNC] Too many playlists to sync, only syncing first ' + MAX_PLAYLISTS + ' playlists.');
        playlists.splice(MAX_PLAYLISTS, playlists.length - MAX_PLAYLISTS);
      }

      for (const playlist of playlists) {
        console.log('[SYNC] Syncing playlists (' + playlists.indexOf(playlist) + ' / ' + playlists.length + ')', playlist);

        const playlistID = playlist.id;
        workingIDDict[playlistID] = playlist;
        setLibraryFetchState({ state: 'playlists', percent: Math.round(playlists.indexOf(playlist) / playlists.length * 100) });

        await new Promise((resolve) => setTimeout(resolve, SLOW_REQUEST_DELAY));
        const playlistData = await spotifyClient.playlists.getPlaylist(playlistID);

        for (const track of playlistData.tracks.items) {
          if (!track || !track.track) continue;
          const trackID = track.track.id;
          if (!trackID) continue;

          if (!workingTrackDict[trackID])
            workingTrackDict[trackID] = [];

          workingTrackDict[trackID].push(playlistData.id);
        }

        setPlaylistTrackDict(workingTrackDict);
        setPlaylistIDDict(workingIDDict);
      }

      setPlaylistTrackDict(workingTrackDict);
      setPlaylistIDDict(workingIDDict);
      saveUsersPlaylists(userProfile.id, workingTrackDict, workingIDDict);
      setLibraryFetchState({ state: 'done', percent: -1 });
    }

    sync();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyClient]);

  return (
    <main className={''}>
      {spotifyClient ? (
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: login, logout: logout }}>
          <PlaylistContext.Provider value={{ playlistIDDict: playlistIDDict, playlistTrackDict: playlistTrackDict }}>
            <PlayerPage></PlayerPage>
            <LibraryFetchContext.Provider value={{ state: libraryFetchState, update: setLibraryFetchState }}>
              <Footer></Footer>
            </LibraryFetchContext.Provider>
          </PlaylistContext.Provider>
        </SpotifyClientContext.Provider>
      ) : (
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: login, logout: logout }}>
          <Intro />
          <Footer></Footer>

        </SpotifyClientContext.Provider>
      )}
    </main>
  );
}
