import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_LIVE_SPOTIFY_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_LIVE_SPOTIFY_AUTH_STATE_PATH = path.join(process.cwd(), ".playwright", "auth", "spotify-live.json");

export function isLiveSpotifyE2EEnabled() {
    return process.env.LIVE_SPOTIFY_E2E === "1";
}

export function isLiveSpotifyInteractive() {
    return process.env.LIVE_SPOTIFY_INTERACTIVE === "1";
}

export function resolveLiveSpotifyBaseUrl() {
    return normalizeBaseUrl(
        process.env.LIVE_SPOTIFY_BASE_URL
        ?? readEnvValue(".env.local", "NEXT_PUBLIC_APP_URL")
        ?? readEnvValue(".env", "NEXT_PUBLIC_APP_URL")
        ?? DEFAULT_LIVE_SPOTIFY_BASE_URL,
    );
}

export function resolveLiveSpotifyAuthStatePath() {
    return path.resolve(process.env.LIVE_SPOTIFY_STORAGE_STATE ?? DEFAULT_LIVE_SPOTIFY_AUTH_STATE_PATH);
}

function normalizeBaseUrl(value: string) {
    const url = new URL(value);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
}

function readEnvValue(filePath: string, key: string) {
    const absolutePath = path.join(process.cwd(), filePath);
    if (!existsSync(absolutePath))
        return undefined;

    const raw = readFileSync(absolutePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith(`${key}=`))
            continue;

        const value = trimmed.slice(`${key}=`.length).trim().replace(/^['"]|['"]$/g, "");
        return value || undefined;
    }

    return undefined;
}
