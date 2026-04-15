import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("spotify login starts the hosted auth flow with the configured redirect uri", async ({ page }) => {
    const expectedOrigin = resolveExpectedSpotifyOrigin().replace(/\/+$/, "");

    await page.route(/https:\/\/accounts\.spotify\.com\/.*/, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<html><body>spotify auth mock</body></html>",
        });
    });

    await page.goto("/");
    await page.getByText("Login with Spotify").click();
    await page.waitForURL(/accounts\.spotify\.com/, { timeout: 15000 });

    const url = new URL(page.url());
    const nestedUrl = url.searchParams.get("continue");
    const authUrl = new URL(nestedUrl ? decodeURIComponent(nestedUrl) : page.url());
    const redirectUri = authUrl.searchParams.get("redirect_uri");

    expect(authUrl.origin).toBe("https://accounts.spotify.com");
    expect(authUrl.pathname).toContain("/authorize");
    expect(decodeURIComponent(redirectUri ?? "")).toBe(`${expectedOrigin}/`);
});

test("spotify callback return auto-enters the authenticated shell without a second click", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem(
            "spotify-sdk:verifier",
            JSON.stringify({ verifier: "test-verifier", expiresOnAccess: true }),
        );
    });

    await installAuthenticatedSpotifyMocks(page, { tokenDelayMs: 250, profileDelayMs: 250 });

    await page.goto("/?code=test-code&state=test-state");

    await expect(page.locator(".intro .loginButton").first()).toBeDisabled();
    await expect(page.locator(".intro .loginButtonSpinner").first()).toBeVisible();
    await expect(page.getByText("Loading...")).toHaveCount(0);

    await expect(page.getByTitle("Refresh Now Playing")).toBeVisible();
    await expect(page.locator(".player")).toBeVisible();
    await expect(page.locator(".intro")).toHaveCount(0);
    await expect(page.getByText("Login with Spotify")).toHaveCount(0);
    await expect(page).not.toHaveURL(/code=/);
});

test("spotify callback return with no verifier recovers back to login", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
        pageErrors.push(error);
    });

    await page.goto("/?code=stale-code&state=stale-state");

    await expect(page.locator(".intro")).toBeVisible();
    await expect(page.getByText("Login with Spotify")).toBeVisible();
    await expect(page.getByTitle("Refresh Now Playing")).toHaveCount(0);
    await expect(page).not.toHaveURL(/code=/);
    expect(pageErrors).toEqual([]);
});

function resolveExpectedSpotifyOrigin(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured)
        return configured;

    const fromLocalEnv = readPublicAppUrl(".env.local") ?? readPublicAppUrl(".env");
    if (fromLocalEnv)
        return fromLocalEnv;

    return "http://127.0.0.1:3100";
}

function readPublicAppUrl(filePath: string): string | undefined {
    try {
        const raw = readFileSync(filePath, "utf8");
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith("NEXT_PUBLIC_APP_URL="))
                continue;

            const value = trimmed.slice("NEXT_PUBLIC_APP_URL=".length).trim().replace(/^['"]|['"]$/g, "");
            return value || undefined;
        }
    } catch {
        return undefined;
    }

    return undefined;
}

async function installAuthenticatedSpotifyMocks(page: Page, options?: { tokenDelayMs?: number; profileDelayMs?: number }) {
    await page.route("https://accounts.spotify.com/api/token", async (route) => {
        if (options?.tokenDelayMs)
            await new Promise((resolve) => setTimeout(resolve, options.tokenDelayMs));
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                access_token: "access-test",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "refresh-test",
            }),
        });
    });

    await page.route("https://api.spotify.com/v1/me", async (route) => {
        if (options?.profileDelayMs)
            await new Promise((resolve) => setTimeout(resolve, options.profileDelayMs));
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: "user-test",
                display_name: "Test User",
                email: "test@example.com",
                country: "US",
                images: [
                    {
                        url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
                    },
                ],
            }),
        });
    });

    await page.route(/https:\/\/api\.spotify\.com\/v1\/me\/playlists(\?.*)?$/, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                href: "https://api.spotify.com/v1/me/playlists?limit=50&offset=0",
                items: [],
                limit: 50,
                next: null,
                offset: 0,
                previous: null,
                total: 0,
            }),
        });
    });

    await page.route(/https:\/\/api\.spotify\.com\/v1\/me\/player\/currently-playing(\?.*)?$/, async (route) => {
        await route.fulfill({
            status: 204,
            body: "",
        });
    });
}
