import { clearSpotifyAuthCallbackParams, isMissingSpotifyVerifierError, trySpotifyLogin } from "@/app/(domain)/spotify/account";
import { getUserProfile } from "@/app/(domain)/spotify/profile";
import { SpotifyApi, UserProfile } from "@spotify/web-api-ts-sdk";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type SpotifyLoginState = {
    client?: SpotifyApi;
    user?: UserProfile;
};

type CompleteSpotifyLoginDependencies = {
    trySpotifyLogin: typeof trySpotifyLogin;
    getUserProfile: typeof getUserProfile;
    clearSpotifyAuthCallbackParams: typeof clearSpotifyAuthCallbackParams;
    isMissingSpotifyVerifierError: typeof isMissingSpotifyVerifierError;
    logError: (message: string, error: unknown) => void;
};

const defaultDependencies: CompleteSpotifyLoginDependencies = {
    trySpotifyLogin,
    getUserProfile,
    clearSpotifyAuthCallbackParams,
    isMissingSpotifyVerifierError,
    logError: (message, error) => console.error(message, error),
};

export async function completeSpotifyLogin(
    router: AppRouterInstance,
    dependencies: CompleteSpotifyLoginDependencies = defaultDependencies,
): Promise<SpotifyLoginState> {
    const newClient = dependencies.trySpotifyLogin(router);

    if (!newClient) {
        return {};
    }

    try {
        const user = await dependencies.getUserProfile(newClient);
        return {
            client: newClient,
            user,
        };
    } catch (error) {
        if (dependencies.isMissingSpotifyVerifierError(error)) {
            dependencies.clearSpotifyAuthCallbackParams();
            return {};
        }

        dependencies.logError('[SPOTIFY-ACCOUNT] Spotify login failed.', error);
        return {};
    }
}

export function createSingleFlightRunner<T>(task: () => Promise<T>): () => Promise<T> {
    let inFlightTask: Promise<T> | undefined = undefined;

    return () => {
        if (inFlightTask) {
            return inFlightTask;
        }

        inFlightTask = task().finally(() => {
            inFlightTask = undefined;
        });

        return inFlightTask;
    };
}
