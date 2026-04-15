import { execFileSync } from "node:child_process";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { isLiveSpotifyInteractive, resolveLiveSpotifyAuthStatePath } from "./liveSpotify.config";

const AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const AUTH_SHELL_TIMEOUT_MS = 30 * 1000;
const SPOTIFY_TOKEN_KEY = "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";

test.describe.configure({ mode: "serial" });

test("captures or validates a live Spotify auth session", async ({ page, context }) => {
    test.setTimeout(AUTH_TIMEOUT_MS);

    await page.goto("/");
    await assertActiveListenerAppLoaded(page);
    await expect.poll(
        async () => readAuthShellState(page),
        {
            timeout: AUTH_SHELL_TIMEOUT_MS,
            message: "Waiting for the login shell or authenticated shell to render.",
        },
    ).not.toBe("pending");

    if (await isAuthenticated(page)) {
        await persistAuthState(context);
        return;
    }

    if (await canCompleteStoredAuth(page)) {
        await waitForAuthenticatedShell(page);
        await persistAuthState(context);
        return;
    }

    if (!isLiveSpotifyInteractive()) {
        throw new Error(
            "Live Spotify auth is missing or stale. Run `npm run e2e:spotify:auth` once, or rerun with `LIVE_SPOTIFY_INTERACTIVE=1`.",
        );
    }

    console.log("[live-auth] Complete the Spotify login in the opened browser window. The authenticated app session will be saved automatically.");
    await clickFirstVisible(page.getByTestId("spotify-login-button"));

    await waitForAuthenticatedShell(page);

    await persistAuthState(context);
});

async function readAuthShellState(page: Page): Promise<"authenticated" | "connecting" | "login" | "pending"> {
    if (await page.getByTestId("spotify-profile-trigger").isVisible().catch(() => false))
        return "authenticated";

    const loginButton = await getFirstVisibleLocator(page.getByTestId("spotify-login-button"));
    if (!loginButton)
        return "pending";

    if ((await loginButton.getAttribute("aria-busy").catch(() => null)) === "true")
        return "connecting";

    if (await loginButton.isDisabled().catch(() => false))
        return "connecting";

    if (((await loginButton.textContent().catch(() => "")) ?? "").includes("Connecting to Spotify"))
        return "connecting";

    if (await loginButton.isVisible().catch(() => false))
        return "login";

    return "pending";
}

async function isAuthenticated(page: Page) {
    return (await readAuthShellState(page)) === "authenticated";
}

async function canCompleteStoredAuth(page: Page) {
    const postLoginState = await readPostLoginState(page);
    return postLoginState === "authenticated" || postLoginState === "callback" || postLoginState === "token" || postLoginState === "connecting";
}

async function waitForAuthenticatedShell(page: Page) {
    await expect.poll(
        async () => {
            const state = await readPostLoginState(page);
            return state !== "login" && state !== "pending";
        },
        {
            timeout: AUTH_TIMEOUT_MS,
            message: "Waiting for Spotify auth to return with callback params, token state, or an authenticated app shell.",
        },
    ).toBe(true);

    if (await isAuthenticated(page))
        return;

    await page.reload({ waitUntil: "domcontentloaded" });
    await assertActiveListenerAppLoaded(page);

    await expect.poll(
        async () => readAuthShellState(page),
        {
            timeout: AUTH_SHELL_TIMEOUT_MS,
            message: "Waiting for the app to settle into the authenticated Spotify shell after login.",
        },
    ).toBe("authenticated");
}

async function assertActiveListenerAppLoaded(page: Page) {
    await expect(page).toHaveTitle(/Active Listener/i, { timeout: AUTH_SHELL_TIMEOUT_MS });

    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/Alexander Yang|AboutResumeContact|Selected Work/i.test(bodyText)) {
        throw new Error(
            [
                "Live Spotify auth opened a different app than Active Listener.",
                `Loaded URL: ${page.url()}`,
                "Another local server is likely already using the configured loopback port.",
                "Stop the other app or point NEXT_PUBLIC_APP_URL, APP_ORIGIN, and LIVE_SPOTIFY_BASE_URL at the same authorized free local origin before rerunning.",
            ].join(" "),
        );
    }
}

async function persistAuthState(context: BrowserContext) {
    const authStatePath = resolveLiveSpotifyAuthStatePath();
    await context.storageState({ path: authStatePath });
    execFileSync("node", ["scripts/spotify-auth-state.mjs", "save", "--path", authStatePath], {
        cwd: process.cwd(),
        stdio: "inherit",
    });
}

async function hasVisibleLocator(locator: Locator) {
    return Boolean(await getFirstVisibleLocator(locator));
}

async function clickFirstVisible(locator: Locator) {
    const candidate = await getFirstVisibleLocator(locator);
    if (candidate) {
        await candidate.click();
        return;
    }

    throw new Error("No visible login button was available to start the Spotify auth flow.");
}

async function readPostLoginState(page: Page): Promise<"authenticated" | "callback" | "token" | "connecting" | "login" | "pending"> {
    if (await isAuthenticated(page))
        return "authenticated";

    const hasCallback = await page.evaluate(() => {
        const params = new URLSearchParams(window.location.search);
        return params.has("code") || params.has("state") || params.has("error");
    }).catch(() => false);
    if (hasCallback)
        return "callback";

    const hasToken = await page.evaluate((tokenKey) => {
        return Boolean(window.localStorage.getItem(tokenKey));
    }, SPOTIFY_TOKEN_KEY).catch(() => false);
    if (hasToken)
        return "token";

    return readAuthShellState(page);
}

async function getFirstVisibleLocator(locator: Locator) {
    const count = await locator.count();

    for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible().catch(() => false))
            return candidate;
    }

    return undefined;
}
