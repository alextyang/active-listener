"use client";

import { SpotifyClientContext, PlaylistDict, LibrarySyncState, LibrarySyncContext, PlaylistContext } from "@/app/(domain)/app/context";
import { syncUserPlaylists } from "@/app/(domain)/spotify/library";
import { useContext, useState, useCallback, useEffect, useRef } from "react";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);
    const [playlistDict, setPlaylistDict] = useState<PlaylistDict | undefined>(undefined);
    const [libraryState, setLibraryState] = useState<LibrarySyncState>({ state: 'waiting' });
    const libraryStateRef = useRef(libraryState);
    const syncRunRef = useRef(0);
    const abortControllerRef = useRef<AbortController | undefined>(undefined);

    useEffect(() => {
        libraryStateRef.current = libraryState;
    }, [libraryState]);

    const handleLibraryStateChange = useCallback((state: LibrarySyncState) => {
        setLibraryState(state);
    }, []);

    const handleLibrarySync = useCallback(async (force: boolean) => {
        if (!spotifyClient.api) {
            abortControllerRef.current?.abort();
            setPlaylistDict(undefined);
            setLibraryState({ state: 'waiting' });
            return;
        }

        const syncRun = syncRunRef.current + 1;
        syncRunRef.current = syncRun;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const dict = await syncUserPlaylists(
                spotifyClient.api,
                libraryStateRef.current,
                force,
                handleLibraryStateChange,
                {
                    identity: { userId: spotifyClient.user?.id },
                    signal: controller.signal,
                },
            );

            if (syncRunRef.current === syncRun && !controller.signal.aborted) {
                setPlaylistDict(dict);
            }
        } finally {
            if (syncRunRef.current === syncRun) {
                abortControllerRef.current = undefined;
            }
        }
    }, [handleLibraryStateChange, spotifyClient.api, spotifyClient.user?.id]);

    useEffect(() => {
        setPlaylistDict(undefined);

        if (!spotifyClient.api) {
            abortControllerRef.current?.abort();
            setLibraryState({ state: 'waiting' });
            return;
        }

        void handleLibrarySync(false);

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [handleLibrarySync, spotifyClient.api, spotifyClient.user?.id]);

    return (
        <LibrarySyncContext.Provider value={{ state: libraryState, requestUpdate: () => void handleLibrarySync(true) }}>
            <PlaylistContext.Provider value={{ playlistDict: playlistDict }}>
                {children}
            </PlaylistContext.Provider>
        </LibrarySyncContext.Provider>
    );
}
