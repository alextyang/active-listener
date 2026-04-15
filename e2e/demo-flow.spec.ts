import { expect, test } from "@playwright/test";
import { buildHydratedTrackScenario, installTrackApiMocks } from "./helpers";

test("demo entrypoint leads to a hydrated track page", async ({ page }) => {
    const trackId = "3FijoNKGof7pCn7oddecOQ";

    await installTrackApiMocks(page, {
        [trackId]: buildHydratedTrackScenario({
            trackId,
            trackName: "Test & Recognise (Flume Re-work)",
            artistName: "Seekae, Flume",
            albumName: "Test & Recognise (Remixes)",
            coverUrl: "https://i.scdn.co/image/ab67616d0000b273b32c686873f16b3adb71f4ac",
            articleTitle: "How the remix reshapes the original",
            summaryText: "Test & Recognise pairs precise percussion with a dense remix palette.",
            getDelayMs: 100,
            refreshDelayMs: 100,
        }),
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Active Listener" })).toBeVisible();
    await expect(page.getByPlaceholder("Search for songs..")).toBeVisible();

    await page.goto(`/demo/${trackId}`);
    await expect(page).toHaveURL(new RegExp(`/demo/${trackId}$`));

    await expect(page.getByText("Test & Recognise (Flume Re-work)")).toBeVisible();
    await expect(page.getByText("How the remix reshapes the original")).toBeVisible();
    await expect(page.getByText("Test & Recognise pairs precise percussion with a dense remix palette.")).toBeVisible();
    await expect(page.getByRole("link", { name: /How the remix reshapes the original/i })).toBeVisible();
});
