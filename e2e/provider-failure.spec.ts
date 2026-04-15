import { expect, test } from "@playwright/test";
import { buildHydratedTrackScenario, installTrackApiMocks } from "./helpers";

test("provider failure is surfaced and retry can recover in place", async ({ page }) => {
    const trackId = "failure01";

    await installTrackApiMocks(page, {
        [trackId]: buildHydratedTrackScenario({
            trackId,
            trackName: "Failure Track",
            artistName: "Retry Artist",
            albumName: "Retry Album",
            coverUrl: "https://i.scdn.co/image/ab67616d0000b273b32c686873f16b3adb71f4ac",
            articleTitle: "Retry article",
            summaryText: "Failure Track eventually recovers after a retry.",
            getDelayMs: 75,
            refreshDelayMs: 75,
            refreshFailures: {
                summary: 1,
            },
        }),
    });

    await page.goto(`/demo/${trackId}`);
    await expect(page.getByText("Failed to refresh summary stage (500): track_refresh_failed")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("Failure Track eventually recovers after a retry.")).toHaveCount(0);

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Failure Track eventually recovers after a retry.")).toBeVisible();
    await expect(page.getByText("Retry article")).toBeVisible();
});
