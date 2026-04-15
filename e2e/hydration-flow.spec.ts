import { expect, test } from "@playwright/test";
import { buildHydratedTrackScenario, installTrackApiMocks } from "./helpers";

test("hydration flow progresses through metadata, articles, and summary", async ({ page }) => {
    const trackId = "hydration01";

    await installTrackApiMocks(page, {
        [trackId]: buildHydratedTrackScenario({
            trackId,
            trackName: "Hydration Track",
            artistName: "Listener Test",
            albumName: "Hydration Album",
            coverUrl: "https://example.com/hydration.png",
            articleTitle: "Hydration review",
            summaryText: "Hydration Track becomes ready after the article and summary stages complete.",
            getDelayMs: 400,
            refreshDelayMs: 400,
        }),
    });

    await page.goto(`/demo/${trackId}`);
    await expect(page.locator(".loadingText")).toContainText("Finding reviews for track...", { timeout: 15000 });
    await expect(page.locator(".loadingText")).toContainText("Generating summary...", { timeout: 15000 });
    await expect(page.getByText("Hydration Track becomes ready after the article and summary stages complete.")).toBeVisible();
    await expect(page.getByText("Hydration review")).toBeVisible();
});
