"use client";

import { SpotifyClientContext, PlaylistDict, LibrarySyncState, LibrarySyncContext, PlaylistContext } from "@/app/(domain)/app/context";
import { syncUserPlaylists } from "@/app/(domain)/spotify/library";
import { useContext, useState, useCallback, useEffect } from "react";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const spotifyClient = useContext(SpotifyClientContext);
    const [playlistDict, setPlaylistDict] = useState<PlaylistDict | undefined>(undefined);
    const [libraryState, setLibraryState] = useState<LibrarySyncState>({ state: 'waiting' });

    // Progress update handler for library sync
    const handleLibraryStateChange = useCallback((state: LibrarySyncState) => {
        setLibraryState(state);
    }, []);

    const handleLibrarySync = useCallback((manual: boolean) => {
        syncUserPlaylists(spotifyClient.api, libraryState, manual, handleLibraryStateChange).then((dict) => {
            setPlaylistDict(dict);
        });
    }, [handleLibraryStateChange, libraryState, spotifyClient]);


    // Sync playlists on page load
    useEffect(() => {
        handleLibrarySync(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spotifyClient]);

    return (
        <LibrarySyncContext.Provider value={{ state: libraryState, requestUpdate: () => handleLibrarySync(true) }}>
            <PlaylistContext.Provider value={{ playlistDict: playlistDict }}>
                {children}
            </PlaylistContext.Provider>
        </LibrarySyncContext.Provider>
    )
}