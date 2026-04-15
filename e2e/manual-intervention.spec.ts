import { expect, test, type Page } from "@playwright/test";
import { MANUAL_E2E_ENABLED, showManualPrompt, waitForManualPromptDismissal } from "./helpers";

const MANUAL_TIMEOUT_MS = 15 * 60 * 1000;
const HYDRATION_TIMEOUT_MS = 180 * 1000;

test.describe("manual Spotify regression", () => {
    test.skip(!MANUAL_E2E_ENABLED, "Set MANUAL_E2E=1 to run the optional manual regression harness.");

    test("authenticated playback and now-playing hydration stay healthy", async ({ page }) => {
        test.setTimeout(MANUAL_TIMEOUT_MS);

        await page.goto("/");
        await expect(page.getByRole("heading", { name: "Active Listener" })).toBeVisible();

        const loginVisible = await page.getByText("Login with Spotify").isVisible().catch(() => false);
        await showManualPrompt(page, {
            title: "Authenticate Spotify and start playback",
            instructions: loginVisible ? [
                "If you are not signed in, click Login with Spotify and complete the browser redirect.",
                "Start any Spotify track so playback is active when you return to this page.",
                "Click Continue after you are signed in and a track is playing.",
            ] : [
                "You already appear to be signed in.",
                "Start any Spotify track so playback is active when you return to this page.",
                "Click Continue after playback is active.",
            ],
            monitor: "The harness will wait for the app shell to expose the now-playing controls and hydrated track content.",
        });
        await waitForManualPromptDismissal(page);

        await expect(page.getByTitle("Refresh Now Playing")).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
        await expect.poll(async () => getSummaryLength(page), { timeout: HYDRATION_TIMEOUT_MS }).toBeGreaterThan(0);
        await expect.poll(async () => getArticleTitles(page).then((titles) => titles.length), { timeout: HYDRATION_TIMEOUT_MS }).toBeGreaterThan(0);
        await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);

        const before = await captureTrackSnapshot(page);
        await showManualPrompt(page, {
            title: "Refresh after a Spotify track change",
            instructions: [
                "Switch Spotify to a different track.",
                "Click the in-app Refresh Now Playing control.",
                "Click Continue once the page has finished updating.",
            ],
            monitor: "The harness will verify the visible summary or article titles change after the refresh settles.",
        });
        await waitForManualPromptDismissal(page);

        await expect.poll(async () => hasSnapshotChanged(page, before), { timeout: HYDRATION_TIMEOUT_MS }).toBeTruthy();
        await expect.poll(async () => getSummaryLength(page), { timeout: HYDRATION_TIMEOUT_MS }).toBeGreaterThan(0);
        await expect.poll(async () => getArticleTitles(page).then((titles) => titles.length), { timeout: HYDRATION_TIMEOUT_MS }).toBeGreaterThan(0);
        await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    });
});

type TrackSnapshot = {
    summary: string;
    articleTitles: string[];
};

async function captureTrackSnapshot(page: Page): Promise<TrackSnapshot> {
    return {
        summary: await getSummaryText(page),
        articleTitles: await getArticleTitles(page),
    };
}

async function hasSnapshotChanged(page: Page, before: TrackSnapshot) {
    const after = await captureTrackSnapshot(page);
    return after.summary !== before.summary || after.articleTitles.join("\n") !== before.articleTitles.join("\n");
}

async function getSummaryLength(page: Page) {
    return (await getSummaryText(page)).length;
}

async function getSummaryText(page: Page) {
    return (await page.locator(".summaryCard .summary").textContent())?.trim() ?? "";
}

async function getArticleTitles(page: Page) {
    return (await page.locator(".articleLink .linkTitle").allTextContents()).map((title: string) => title.trim()).filter(Boolean);
}
