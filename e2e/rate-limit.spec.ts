import { expect, test } from "@playwright/test";
import { buildTrackView } from "./helpers";

test("rate-limited summary refresh surfaces retry timing and can recover", async ({ page }) => {
    const trackId = "rateLimit01";
    let refreshAttempts = 0;

    const initialView = buildTrackView({
        trackId,
        trackName: "Rate Limited Track",
        artistName: "Throttle Artist",
        albumName: "Throttle Album",
        coverUrl: "https://i.scdn.co/image/ab67616d0000b273b32c686873f16b3adb71f4ac",
        articleTitle: "Throttle review",
        summaryText: undefined,
        status: {
            summary: { status: "idle" },
        },
        needsRefresh: {
            summary: true,
        },
    });

    const recoveredView = {
        ...initialView,
        summary: "Rate-limited flows recover cleanly after the retry window.",
        status: {
            ...initialView.status,
            summary: {
                status: "ready",
                updatedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
            },
        },
        needsRefresh: {
            ...initialView.needsRefresh,
            summary: false,
        },
    };

    await page.route(new RegExp(`/api/tracks/${trackId}$`), async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(initialView),
        });
    });

    await page.route(new RegExp(`/api/tracks/${trackId}/summary/stream$`), async (route) => {
        refreshAttempts += 1;

        if (refreshAttempts === 1) {
            await route.fulfill({
                status: 429,
                contentType: "application/json",
                body: JSON.stringify({ error: "rate_limited", retryAfterSeconds: 7 }),
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: "application/x-ndjson",
            body: [
                JSON.stringify({ type: "delta", delta: recoveredView.summary }),
                JSON.stringify({ type: "complete", view: recoveredView }),
            ].join("\n"),
        });
    });

    await page.goto(`/demo/${trackId}`);
    await expect(page.getByText("Failed to refresh summary stage (429). Retry after 7s.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Rate-limited flows recover cleanly after the retry window.")).toBeVisible();
    await expect(page.getByText("Throttle review")).toBeVisible();
});
