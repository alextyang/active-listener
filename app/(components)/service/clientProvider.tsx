"use client";

import { SpotifyClientContext } from "@/app/(domain)/app/context";
import { trySpotifyLogin, trySpotifyLogout, shouldAutoLogin } from "@/app/(domain)/spotify/account";
import { getUserProfile } from "@/app/(domain)/spotify/profile";
import { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { LibraryProvider } from "./libraryProvider";
import { LoadingScreen } from "../site/loadingScreen";

export function ClientProvider({ children, loginPage }: { children: React.ReactNode, loginPage: React.ReactNode }) {
    const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | undefined>(undefined);
    const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
    const [loggingIn, setLoggingIn] = useState(false);

    const router = useRouter();

    const handleLogin = useCallback(() => {
        const newClient = trySpotifyLogin(router);
        setSpotifyClient(newClient);
        getUserProfile(newClient).then(setUserProfile);
        setLoggingIn(false);
    }, [router]);

    const handleLogout = useCallback(() => {
        trySpotifyLogout(spotifyClient, setSpotifyClient, router);
        setUserProfile(undefined);
    }, [spotifyClient, router]);

    // Auto-login on page load
    useEffect(() => {
        setLoggingIn(true);
        if (shouldAutoLogin(spotifyClient))
            handleLogin();
        else
            setLoggingIn(false);
    }, [handleLogin, spotifyClient]);

    if (loggingIn) // Show nothing while auto-logging in
        return (
            <LoadingScreen></LoadingScreen>
        );

    if (!spotifyClient) // Show login / splash screen if not logged in
        return (
            <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: handleLogin, logout: handleLogout }}>
                {loginPage}
            </SpotifyClientContext.Provider>
        );

    return (
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, login: handleLogin, logout: handleLogout }}>
            <LibraryProvider>
                {children}
            </LibraryProvider>
        </SpotifyClientContext.Provider>

    )
}