"use client";

import { SpotifyClientContext } from "@/app/(domain)/app/context";
import { trySpotifyLogout, shouldAutoLogin } from "@/app/(domain)/spotify/account";
import { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { LibraryProvider } from "./libraryProvider";
import { completeSpotifyLogin, createSingleFlightRunner } from "./clientProvider.auth";

export function ClientProvider({ children, loginPage }: { children: React.ReactNode, loginPage: React.ReactNode }) {
    const [spotifyClient, setSpotifyClient] = useState<SpotifyApi | undefined>(undefined);
    const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
    const [loggingIn, setLoggingIn] = useState(false);
    const loginRunnerRef = useRef<(() => Promise<void>) | undefined>(undefined);
    const autoLoginAttemptedRef = useRef(false);

    const router = useRouter();

    useEffect(() => {
        loginRunnerRef.current = undefined;
    }, [router]);

    const handleLogin = useCallback(() => {
        if (!loginRunnerRef.current) {
            loginRunnerRef.current = createSingleFlightRunner(async () => {
                setLoggingIn(true);

                try {
                    const nextState = await completeSpotifyLogin(router);
                    setSpotifyClient(nextState.client);
                    setUserProfile(nextState.user);
                } finally {
                    setLoggingIn(false);
                }
            });
        }

        return loginRunnerRef.current();
    }, [router]);

    const handleLogout = useCallback(() => {
        trySpotifyLogout(spotifyClient, setSpotifyClient, router);
        setUserProfile(undefined);
        setLoggingIn(false);
        autoLoginAttemptedRef.current = false;
    }, [spotifyClient, router]);

    // Auto-login on page load
    useEffect(() => {
        if (autoLoginAttemptedRef.current) return;
        if (!shouldAutoLogin(spotifyClient)) return;

        autoLoginAttemptedRef.current = true;
        void handleLogin();
    }, [handleLogin, spotifyClient]);

    if (!spotifyClient) // Show login / splash screen if not logged in
        return (
            <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, isLoggingIn: loggingIn, login: () => void handleLogin(), logout: handleLogout }}>
                {loginPage}
            </SpotifyClientContext.Provider>
        );

    return (
        <SpotifyClientContext.Provider value={{ api: spotifyClient, user: userProfile, isLoggingIn: loggingIn, login: () => void handleLogin(), logout: handleLogout }}>
            <LibraryProvider>
                {children}
            </LibraryProvider>
        </SpotifyClientContext.Provider>

    )
}
