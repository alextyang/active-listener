import { expect, test } from "@playwright/test";
import { buildHydratedTrackScenario, installTrackApiMocks } from "./helpers";

test("summary stage renders incremental streamed text before the final summary completes", async ({ page }) => {
    const trackId = "streaming01";
    const scenario = buildHydratedTrackScenario({
        trackId,
        trackName: "Streaming Track",
        artistName: "Stream Artist",
        albumName: "Streaming Album",
        coverUrl: "https://example.com/streaming.png",
        articleTitle: "Streaming review",
        summaryText: "Streamed summary appears before completion.",
        getDelayMs: 200,
        refreshDelayMs: 200,
    });

    await installTrackApiMocks(page, {
        [trackId]: scenario,
    });

    await page.addInitScript(({ activeTrackId, finalView, chunks, chunkDelayMs }) => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (input, init) => {
            const url = typeof input === "string"
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;

            if (!url.includes(`/api/tracks/${activeTrackId}/summary/stream`))
                return originalFetch(input, init);

            const encoder = new TextEncoder();
            const stream = new ReadableStream<Uint8Array>({
                async start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "delta", delta: chunk })}\n`));
                        await new Promise((resolve) => setTimeout(resolve, chunkDelayMs));
                    }

                    controller.enqueue(encoder.encode(`${JSON.stringify({ type: "complete", view: finalView })}\n`));
                    controller.close();
                },
            });

            return new Response(stream, {
                status: 200,
                headers: {
                    "Content-Type": "application/x-ndjson",
                },
            });
        };
    }, {
        activeTrackId: trackId,
        finalView: scenario.refresh?.summary,
        chunks: ["Streamed summary ", "appears before completion."],
        chunkDelayMs: 900,
    });

    await page.goto(`/demo/${trackId}`);

    await expect(page.locator(".loadingText")).toContainText("Generating summary...", { timeout: 15000 });
    await expect(page.locator(".summary")).toContainText("Streamed summary", { timeout: 15000 });
    await expect(page.getByText("Streamed summary appears before completion.")).toHaveCount(0);
    await expect(page.getByText("Streamed summary appears before completion.")).toBeVisible({ timeout: 15000 });
});
