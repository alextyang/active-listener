import { LibrarySyncContext, LibrarySyncState, PlaylistContext } from "@/app/(domain)/app/context";
import { useContext, useRef, useCallback, use, useEffect, useState } from "react";


export function LibraryStatus() {
    const libraryState = useContext(LibrarySyncContext);
    const playlists = useContext(PlaylistContext);
    const [message, setMessage] = useState<string>('');

    const displayLibraryState = useCallback((libraryState: LibrarySyncState) => {
        if (libraryState.state === 'waiting' && !playlists.playlistDict) setMessage('No library loaded.');
        else if (libraryState.state === 'waiting' && playlists.playlistDict) setMessage('Library loaded.');
        else if (libraryState.state === 'library') setMessage('Syncing library...');
        else if (libraryState.state === 'playlists') setMessage('Syncing playlists... (' + libraryState.percent + '%)');
    }, [playlists.playlistDict]);

    useEffect(() => {
        displayLibraryState(libraryState.state);
    }, [displayLibraryState, libraryState.state]);


    const handleMouseEnter = useCallback(() => {
        setMessage('Click to refresh library.');
    }, []);

    const handleMouseLeave = useCallback(() => {
        displayLibraryState(libraryState.state);
    }, [displayLibraryState, libraryState.state]);

    const handleClick = useCallback(() => {
        libraryState.requestUpdate();
    }, [libraryState]);

    return (
        <div className="footerMessage" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick}>
            {message}
        </div>
    )
}