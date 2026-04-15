import { expect, test } from "@playwright/test";
import { buildTrackView, installTrackApiMocks } from "./helpers";

test("a late track response does not overwrite a newer selection", async ({ page }) => {
    const trackA = "switchA";
    const trackB = "switchB";

    await installTrackApiMocks(page, {
        [trackA]: {
            initial: buildTrackView({
                trackId: trackA,
                trackName: "Stale Track",
                artistName: "Old Artist",
                albumName: "Old Album",
                coverUrl: "https://example.com/stale.png",
                articleTitle: "Stale article",
                summaryText: "Stale summary should never win.",
            }),
            getDelayMs: 900,
        },
        [trackB]: {
            initial: buildTrackView({
                trackId: trackB,
                trackName: "Fresh Track",
                artistName: "New Artist",
                albumName: "New Album",
                coverUrl: "https://example.com/fresh.png",
                articleTitle: "Fresh article",
                summaryText: "Fresh summary is the only one that should remain visible.",
            }),
            getDelayMs: 25,
        },
    });

    await page.goto(`/demo/${trackA}`);
    await page.waitForTimeout(75);
    await page.goto(`/demo/${trackB}`);

    await expect(page).toHaveURL(new RegExp(`/demo/${trackB}$`));
    await expect(page.getByText("Fresh Track")).toBeVisible();
    await expect(page.getByText("Fresh summary is the only one that should remain visible.")).toBeVisible();
    await expect(page.getByText("Stale Track")).toHaveCount(0);
});
