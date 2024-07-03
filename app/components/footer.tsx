import { use, useContext, useEffect, useRef, useState } from "react";
import { LibraryFetchContext, PlaybackContext, SpotifyClientContext } from "../context";
import Image from "next/image";
import { UserProfile } from "@spotify/web-api-ts-sdk";
import Profile from "./profile";
import Link from "next/link";

export default function Footer() {
    const libraryFetchState = useContext(LibraryFetchContext);
    const message = useRef<string>('');

    if (libraryFetchState.state.state === 'done') message.current = ('Library loaded.');
    else if (libraryFetchState.state.state === 'library') message.current = ('Syncing library...');
    else if (libraryFetchState.state.state === 'playlists') message.current = ('Syncing playlists... (' + libraryFetchState.state.percent + '%)');

    return (
        <div className="footer">
            <div className="footerLinks">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/about">About</Link>
            </div>
            <div className="footerMessage">
                {message.current}
            </div>
            <Profile></Profile>
        </div>
    )
}