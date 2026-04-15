import { defineConfig, devices } from "@playwright/test";
import { isLiveSpotifyE2EEnabled, isLiveSpotifyInteractive, resolveLiveSpotifyAuthStatePath, resolveLiveSpotifyBaseUrl } from "./e2e/liveSpotify.config";

const MOCK_PORT = 3100;
const LIVE_SPOTIFY_E2E_ENABLED = isLiveSpotifyE2EEnabled();
const LIVE_SPOTIFY_INTERACTIVE = isLiveSpotifyInteractive();
const manualSpecPattern = "**/manual-intervention.spec.ts";
const liveSpotifyAuthPattern = "**/live-auth.setup.ts";
const liveSpotifySpecPattern = "**/live-spotify.spec.ts";
const baseURL = LIVE_SPOTIFY_E2E_ENABLED ? resolveLiveSpotifyBaseUrl() : `http://127.0.0.1:${MOCK_PORT}`;
const webServerUrl = new URL(baseURL);
const authStatePath = resolveLiveSpotifyAuthStatePath();

const testIgnore = [];
if (process.env.MANUAL_E2E !== "1")
    testIgnore.push(manualSpecPattern);
if (!LIVE_SPOTIFY_E2E_ENABLED)
    testIgnore.push(liveSpotifyAuthPattern, liveSpotifySpecPattern);

const projects = LIVE_SPOTIFY_E2E_ENABLED ? [
    {
        name: "live-auth-setup",
        testMatch: /.*live-auth\.setup\.ts/,
        use: {
            ...devices["Desktop Chrome"],
            storageState: authStatePath,
        },
    },
    {
        name: "live-spotify",
        testMatch: /.*live-spotify\.spec\.ts/,
        dependencies: ["live-auth-setup"],
        use: {
            ...devices["Desktop Chrome"],
            storageState: authStatePath,
        },
    },
] : [
    {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
    },
];

export default defineConfig({
    testDir: "./e2e",
    testMatch: /.*\.spec\.ts/,
    testIgnore,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["github"]] : [["list"]],
    use: {
        baseURL,
        headless: !(LIVE_SPOTIFY_E2E_ENABLED && LIVE_SPOTIFY_INTERACTIVE),
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: {
        command: `npm run start -- --hostname ${webServerUrl.hostname} --port ${webServerUrl.port || (webServerUrl.protocol === "https:" ? "443" : "80")}`,
        url: baseURL,
        // Live Spotify auth must own the local loopback server so the suite does not
        // accidentally attach to an unrelated app already running on the same port.
        reuseExistingServer: !process.env.CI && !LIVE_SPOTIFY_E2E_ENABLED,
        timeout: 120000,
    },
    projects,
});
