import { expect, test, type Page } from "@playwright/test";
import { showManualPrompt, waitForManualPromptDismissal } from "./helpers";
import { isLiveSpotifyInteractive } from "./liveSpotify.config";

const LIVE_TIMEOUT_MS = 12 * 60 * 1000;
const HYDRATION_TIMEOUT_MS = 3 * 60 * 1000;
const CONTROL_TIMEOUT_MS = 45 * 1000;
const RELEVANT_ERROR_PATTERNS = [
    "JSON Parse error",
    "Unable to parse JSON string",
    "No verifier found in cache",
];

test.describe.serial("live Spotify regression", () => {
    test("reuses auth and keeps live Spotify features healthy", async ({ page }) => {
        test.setTimeout(LIVE_TIMEOUT_MS);

        const relevantErrors: string[] = [];
        page.on("pageerror", (error) => collectRelevantError(relevantErrors, error.message));
        page.on("console", (message) => {
            if (message.type() !== "error")
                return;
            collectRelevantError(relevantErrors, message.text());
        });

        await page.goto("/");
        await expect(page.getByTestId("spotify-profile-trigger")).toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId("spotify-login-button")).toHaveCount(0);

        await ensurePlaybackContext(page);
        await waitForHydratedTrack(page);

        await expect.poll(async () => getLibraryStatus(page), {
            timeout: HYDRATION_TIMEOUT_MS,
            message: "Waiting for the authenticated playlist sync to settle.",
        }).toBe("Library loaded.");

        await page.getByTestId("spotify-refresh-now-playing").click();
        await waitForHydratedTrack(page);

        await seekTimeline(page, 0.35);
        await assertProgressAdvances(page);
        await assertPauseResume(page);
        await seekTimeline(page, 0.6);

        const beforeNext = await getTrackState(page);
        await page.getByTestId("spotify-skip-next").click();
        await expect.poll(async () => didTrackAdvance(page, beforeNext), {
            timeout: CONTROL_TIMEOUT_MS,
            message: "Expected skip-next to move playback forward to another track.",
        }).toBeTruthy();
        await waitForHydratedTrack(page);

        await page.waitForTimeout(5_000);
        const beforePrevious = await getTrackState(page);
        await page.getByTestId("spotify-skip-previous").click();
        await expect.poll(async () => didPreviousActionApply(page, beforePrevious), {
            timeout: CONTROL_TIMEOUT_MS,
            message: "Expected skip-previous to restart the current track or move to the prior track.",
        }).toBeTruthy();
        await waitForHydratedTrack(page);

        await page.getByTestId("spotify-library-status").click();
        await expect.poll(async () => getLibraryStatus(page), {
            timeout: HYDRATION_TIMEOUT_MS,
            message: "Waiting for manual library refresh to settle.",
        }).toBe("Library loaded.");

        expect(relevantErrors).toEqual([]);
    });
});

async function ensurePlaybackContext(page: Page) {
    if (await hasPlaybackContext(page))
        return;

    if (!isLiveSpotifyInteractive()) {
        throw new Error(
            "No active Spotify playback is available. Start playback from a Spotify Premium account, ideally from a multi-track playlist or album, then rerun with `LIVE_SPOTIFY_INTERACTIVE=1`.",
        );
    }

    await showManualPrompt(page, {
        title: "Start live Spotify playback",
        instructions: [
            "Start playback in Spotify from a multi-track playlist or album.",
            "Return to Active Listener once the track is playing.",
            "Click Continue when the now-playing bar should be available.",
        ],
        monitor: "The suite will resume automatically after the app exposes an authenticated now-playing track.",
    });
    await waitForManualPromptDismissal(page);

    await expect.poll(async () => hasPlaybackContext(page), {
        timeout: HYDRATION_TIMEOUT_MS,
        message: "Waiting for a live now-playing track after the manual playback prompt.",
    }).toBeTruthy();
}

async function waitForHydratedTrack(page: Page) {
    await expect(page.getByTestId("spotify-refresh-now-playing")).toBeVisible({ timeout: HYDRATION_TIMEOUT_MS });
    await expect(page.getByTestId("track-runtime-retry")).toHaveCount(0);
    await expect.poll(async () => getCurrentTrackTitle(page), {
        timeout: HYDRATION_TIMEOUT_MS,
        message: "Waiting for a visible current track title.",
    }).not.toBe("");
    await expect.poll(async () => getSummaryLength(page), {
        timeout: HYDRATION_TIMEOUT_MS,
        message: "Waiting for the authenticated summary pipeline to produce visible text.",
    }).toBeGreaterThan(0);
}

async function hasPlaybackContext(page: Page) {
    return (await getCurrentTrackTitle(page)).length > 0;
}

async function getCurrentTrackTitle(page: Page) {
    return (await page.getByTestId("spotify-current-track").textContent())?.trim() ?? "";
}

async function getSummaryLength(page: Page) {
    return ((await page.getByTestId("spotify-summary-text").textContent())?.trim() ?? "").length;
}

async function getLibraryStatus(page: Page) {
    return (await page.getByTestId("spotify-library-status").textContent())?.trim() ?? "";
}

async function seekTimeline(page: Page, percent: number) {
    const timeline = page.getByTestId("spotify-timeline");
    const box = await timeline.boundingBox();
    if (!box)
        throw new Error("Spotify timeline is not visible.");

    await page.mouse.click(box.x + box.width * percent, box.y + box.height / 2);
    await expect.poll(async () => getTimelineProgress(page), {
        timeout: CONTROL_TIMEOUT_MS,
        message: `Waiting for the playback position to move near ${Math.round(percent * 100)}%.`,
    }).toBeGreaterThan(Math.max(percent - 0.2, 0));
}

async function assertProgressAdvances(page: Page) {
    const before = await getTimelineProgress(page);
    await page.waitForTimeout(2_500);
    const after = await getTimelineProgress(page);

    expect(after).toBeGreaterThan(before + 0.002);
}

async function assertPauseResume(page: Page) {
    await page.getByTestId("spotify-toggle-playback").click();
    const pausedAt = await getTimelineProgress(page);
    await page.waitForTimeout(2_500);
    const pausedAfter = await getTimelineProgress(page);
    expect(Math.abs(pausedAfter - pausedAt)).toBeLessThan(0.01);

    await page.getByTestId("spotify-toggle-playback").click();
    await expect.poll(async () => getTimelineProgress(page), {
        timeout: CONTROL_TIMEOUT_MS,
        message: "Waiting for playback to resume after toggling pause.",
    }).toBeGreaterThan(pausedAfter + 0.002);
}

async function getTimelineProgress(page: Page) {
    const styleValue = await page.getByTestId("spotify-timeline-progress").getAttribute("style");
    const styleMatch = styleValue?.match(/scaleX\(([-\d.]+)%\)/);
    if (styleMatch) {
        return Math.max(0, Math.min(Number(styleMatch[1]) / 100, 1));
    }

    const bar = await page.getByTestId("spotify-timeline-bar").boundingBox();
    const progress = await page.getByTestId("spotify-timeline-progress").boundingBox();

    if (!bar || !progress || bar.width <= 0)
        return 0;

    return Math.max(0, Math.min(progress.width / bar.width, 1));
}

type TrackState = {
    href: string;
    title: string;
    progress: number;
};

async function getTrackState(page: Page): Promise<TrackState> {
    const currentTrack = page.getByTestId("spotify-current-track");
    return {
        href: (await currentTrack.getAttribute("href")) ?? "",
        title: await getCurrentTrackTitle(page),
        progress: await getTimelineProgress(page),
    };
}

async function didTrackAdvance(page: Page, before: TrackState) {
    const after = await getTrackState(page);
    return after.href !== before.href || after.title !== before.title;
}

async function didPreviousActionApply(page: Page, before: TrackState) {
    const after = await getTrackState(page);
    return after.href !== before.href || after.title !== before.title || after.progress < Math.min(before.progress, 0.15);
}

function collectRelevantError(errors: string[], message: string) {
    if (RELEVANT_ERROR_PATTERNS.some((pattern) => message.includes(pattern)))
        errors.push(message);
}
