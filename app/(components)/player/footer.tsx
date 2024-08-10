import { LibraryContext, LibraryState } from "@/app/(domain)/context";
import Link from "next/link";
import { useContext, useRef, useCallback, use, useEffect, useState } from "react";
import Profile from "../spotify/profile";
import { shouldSyncPlaylists } from "@/app/(domain)/spotify/library";

export function Footer() {
    return (
        <div className="footer">
            <div className="footerLinks">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/about">About</Link>
            </div>
            <LibraryMessage />
            <Profile></Profile>
        </div>
    )
}

function LibraryMessage() {
    const libraryState = useContext(LibraryContext);
    const [message, setMessage] = useState<string>('');

    const displayLibraryState = useCallback((libraryState: LibraryState) => {
        if (libraryState.state === 'done') setMessage('Library loaded.');
        else if (libraryState.state === 'library') setMessage('Syncing library...');
        else if (libraryState.state === 'playlists') setMessage('Syncing playlists... (' + libraryState.percent + '%)');
        else if (libraryState.state === 'no-library') setMessage('No library loaded.');
    }, []);

    useEffect(() => {
        displayLibraryState(libraryState.state);
    }, [displayLibraryState, libraryState.state]);


    const handleMouseEnter = useCallback(() => {
        if (shouldSyncPlaylists(libraryState.state))
            setMessage('Click to refresh.');
    }, [libraryState.state]);

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