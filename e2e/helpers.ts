import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { CompleteArticle, TrackLastError, TrackMetadataRecord, TrackStageName, TrackStageState, TrackView } from "../app/(domain)/app/types";

const searchFlightPath = path.join(process.cwd(), "e2e/fixtures/search-response.txt");
export const MANUAL_E2E_ENABLED = process.env.MANUAL_E2E === "1";
export const MANUAL_PROMPT_TEST_ID = "manual-intervention-prompt";
const MANUAL_CONTINUE_LABEL = "Continue";

export type TrackScenario = {
    initial: TrackView;
    refresh?: Partial<Record<TrackStageName, TrackView>>;
    refreshFailures?: Partial<Record<TrackStageName, number>>;
    summaryStreamChunks?: string[];
    getDelayMs?: number;
    refreshDelayMs?: number;
};

export function loadSearchFlightResponse() {
    return readFileSync(searchFlightPath, "utf8");
}

export type ManualPromptOptions = {
    title: string;
    instructions: string[];
    monitor?: string;
    continueLabel?: string;
};

export async function showManualPrompt(page: Page, options: ManualPromptOptions) {
    const lines = [
        `[MANUAL E2E] ${options.title}`,
        ...options.instructions.map((instruction) => `- ${instruction}`),
    ];

    if (options.monitor)
        lines.push(`Monitor: ${options.monitor}`);

    console.log(lines.join("\n"));

    await page.evaluate(({ title, instructions, monitor, continueLabel, testId }) => {
        const existing = document.getElementById(testId);
        existing?.remove();

        const overlay = document.createElement("aside");
        overlay.id = testId;
        overlay.setAttribute("data-testid", testId);
        overlay.dataset.testid = testId;
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", title);
        overlay.style.position = "fixed";
        overlay.style.top = "16px";
        overlay.style.right = "16px";
        overlay.style.zIndex = "2147483647";
        overlay.style.maxWidth = "420px";
        overlay.style.padding = "16px";
        overlay.style.borderRadius = "16px";
        overlay.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        overlay.style.background = "rgba(17, 20, 27, 0.96)";
        overlay.style.boxShadow = "0 24px 64px rgba(0, 0, 0, 0.4)";
        overlay.style.color = "#f5f7fb";
        overlay.style.fontFamily = "system-ui, sans-serif";
        overlay.style.pointerEvents = "auto";

        const container = document.createElement("div");
        container.style.display = "grid";
        container.style.gap = "12px";

        const heading = document.createElement("h2");
        heading.textContent = title;
        heading.style.margin = "0";
        heading.style.fontSize = "18px";
        heading.style.lineHeight = "1.25";

        const instructionList = document.createElement("ol");
        instructionList.style.margin = "0";
        instructionList.style.paddingLeft = "18px";
        instructionList.style.display = "grid";
        instructionList.style.gap = "8px";

        for (const instruction of instructions) {
            const item = document.createElement("li");
            item.textContent = instruction;
            instructionList.appendChild(item);
        }

        container.appendChild(heading);
        container.appendChild(instructionList);

        if (monitor) {
            const monitorText = document.createElement("p");
            monitorText.textContent = monitor;
            monitorText.style.margin = "0";
            monitorText.style.fontSize = "13px";
            monitorText.style.lineHeight = "1.4";
            monitorText.style.color = "#b9c2d3";
            container.appendChild(monitorText);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = continueLabel;
        button.style.alignSelf = "start";
        button.style.border = "0";
        button.style.borderRadius = "999px";
        button.style.padding = "10px 14px";
        button.style.background = "#f5f7fb";
        button.style.color = "#11151d";
        button.style.fontWeight = "700";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => overlay.remove());

        container.appendChild(button);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }, {
        title: options.title,
        instructions: options.instructions,
        monitor: options.monitor,
        continueLabel: options.continueLabel ?? MANUAL_CONTINUE_LABEL,
        testId: MANUAL_PROMPT_TEST_ID,
    });
}

export async function waitForManualPromptDismissal(page: Page) {
    await page.locator(`[data-testid="${MANUAL_PROMPT_TEST_ID}"]`).waitFor({ state: "detached" });
}

export async function installTrackApiMocks(page: Page, scenarios: Record<string, TrackScenario>) {
    const remainingFailures = new Map<string, Partial<Record<TrackStageName, number>>>();

    for (const [trackId, scenario] of Object.entries(scenarios))
        remainingFailures.set(trackId, { ...scenario.refreshFailures });

    await page.route(/\/api\/tracks\/[^/]+(?:\/refresh|\/summary\/stream)?$/, async (route) => {
        const url = new URL(route.request().url());
        const parts = url.pathname.split("/").filter(Boolean);
        const trackId = decodeURIComponent(parts[2] ?? "");
        const scenario = scenarios[trackId];

        if (!scenario) {
            await route.fulfill({
                status: 404,
                contentType: "application/json",
                body: JSON.stringify({ error: "missing_track_fixture", trackId }),
            });
            return;
        }

        const isSummaryStream = parts[3] === "summary" && parts[4] === "stream";

        if (parts[3] === "refresh" || isSummaryStream) {
            const payload = route.request().postDataJSON() as { stage?: TrackStageName } | undefined;
            const stage = isSummaryStream ? "summary" : payload?.stage;
            const failures = remainingFailures.get(trackId);
            const remaining = stage ? failures?.[stage] ?? 0 : 0;

            if (stage && remaining > 0) {
                if (failures) failures[stage] = remaining - 1;
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "track_refresh_failed", trackId, stage }),
                });
                return;
            }

            if (scenario.refreshDelayMs)
                await delay(scenario.refreshDelayMs);

            const response = stage && scenario.refresh?.[stage] ? scenario.refresh[stage]! : scenario.initial;
            if (isSummaryStream) {
                const chunks = scenario.summaryStreamChunks ?? [response.summary ?? ""];
                const body = [
                    ...chunks.filter(Boolean).map((delta) => JSON.stringify({ type: "delta", delta })),
                    JSON.stringify({ type: "complete", view: response }),
                ].join("\n");

                await route.fulfill({
                    status: 200,
                    contentType: "application/x-ndjson",
                    body,
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(response),
                });
            }
            return;
        }

        if (scenario.getDelayMs)
            await delay(scenario.getDelayMs);

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(scenario.initial),
        });
    });
}

export function buildHydratedTrackScenario(input: {
    trackId: string;
    trackName: string;
    artistName: string;
    albumName: string;
    coverUrl: string;
    articleTitle: string;
    articleSiteName?: string;
    summaryText: string;
    getDelayMs?: number;
    refreshDelayMs?: number;
    refreshFailures?: Partial<Record<TrackStageName, number>>;
}): TrackScenario {
    const metadata = buildTrackMetadata(input);
    const article = buildArticle({
        link: `https://example.com/${input.trackId}/review`,
        title: input.articleTitle,
        siteName: input.articleSiteName ?? "Example Review",
        excerpt: `${input.trackName} context from ${input.articleTitle}.`,
        byline: "Staff Writer",
        relevance: "0.95",
        wordCount: 900,
    });

    const readyStatus = (message?: string): TrackStageState => ({
        status: "ready",
        updatedAt: nowIso(),
        expiresAt: futureIso(60),
        message,
    });

    const initial: TrackView = {
        trackId: input.trackId,
        metadata: undefined,
        articles: [],
        summary: undefined,
        status: {
            metadata: { status: "idle" },
            articles: { status: "idle" },
            summary: { status: "idle" },
        },
        needsRefresh: {
            metadata: true,
            articles: true,
            summary: true,
        },
    };

    const metadataReady: TrackView = {
        ...initial,
        metadata,
        status: {
            metadata: readyStatus(),
            articles: { status: "idle" },
            summary: { status: "idle" },
        },
        needsRefresh: {
            metadata: false,
            articles: true,
            summary: true,
        },
    };

    const articlesReady: TrackView = {
        ...metadataReady,
        articles: [article],
        status: {
            ...metadataReady.status,
            articles: readyStatus(),
            summary: { status: "idle" },
        },
        needsRefresh: {
            metadata: false,
            articles: false,
            summary: true,
        },
    };

    const summaryReady: TrackView = {
        ...articlesReady,
        summary: input.summaryText,
        status: {
            ...articlesReady.status,
            summary: readyStatus(),
        },
        needsRefresh: {
            metadata: false,
            articles: false,
            summary: false,
        },
    };

    return {
        initial,
        refresh: {
            metadata: metadataReady,
            articles: articlesReady,
            summary: summaryReady,
        },
        summaryStreamChunks: splitSummaryIntoChunks(input.summaryText),
        refreshFailures: input.refreshFailures,
        getDelayMs: input.getDelayMs,
        refreshDelayMs: input.refreshDelayMs,
    };
}

export function buildTrackView(input: {
    trackId: string;
    trackName: string;
    artistName: string;
    albumName: string;
    coverUrl: string;
    summaryText?: string;
    articleTitle?: string;
    articleSiteName?: string;
    articleLink?: string;
    articleExcerpt?: string;
    lastError?: TrackLastError;
    status?: Partial<Record<TrackStageName, TrackStageState>>;
    needsRefresh?: Partial<Record<TrackStageName, boolean>>;
}): TrackView {
    const metadata = buildTrackMetadata(input);
    const article = input.articleTitle
        ? buildArticle({
            link: input.articleLink ?? `https://example.com/${input.trackId}/review`,
            title: input.articleTitle,
            siteName: input.articleSiteName ?? "Example Review",
            excerpt: input.articleExcerpt ?? `${input.trackName} in review.`,
            byline: "Staff Writer",
            relevance: "0.95",
            wordCount: 900,
        })
        : undefined;

    return {
        trackId: input.trackId,
        metadata,
        articles: article ? [article] : [],
        summary: input.summaryText,
        status: {
            metadata: input.status?.metadata ?? readyStage(),
            articles: input.status?.articles ?? readyStage(),
            summary: input.status?.summary ?? readyStage(),
        },
        lastError: input.lastError,
        needsRefresh: {
            metadata: input.needsRefresh?.metadata ?? false,
            articles: input.needsRefresh?.articles ?? false,
            summary: input.needsRefresh?.summary ?? false,
        },
    };
}

function buildTrackMetadata(input: {
    trackId: string;
    trackName: string;
    artistName: string;
    albumName: string;
    coverUrl: string;
}): TrackMetadataRecord {
    const album = {
        id: `${input.trackId}-album`,
        name: input.albumName,
        uri: `spotify:album:${input.trackId}`,
        images: [{ url: input.coverUrl, width: 640, height: 640 }],
        genres: [],
    } as any;

    const artist = {
        id: `${input.trackId}-artist`,
        name: input.artistName,
        uri: `spotify:artist:${input.trackId}`,
        genres: [],
        images: [],
    } as any;

    const track = {
        id: input.trackId,
        name: input.trackName,
        uri: `spotify:track:${input.trackId}`,
        album,
        artists: [artist],
    } as any;

    return {
        track,
        album,
        artists: [artist],
        siblingAlbums: [],
        topTracks: [],
        palette: {
            Muted: {
                rgb: [42, 42, 48],
                hex: "#2a2a30",
            },
        },
    };
}

function buildArticle(input: {
    link: string;
    title: string;
    siteName: string;
    excerpt: string;
    byline: string;
    relevance: string;
    wordCount: number;
}): CompleteArticle {
    return {
        link: input.link,
        title: input.title,
        excerpt: input.excerpt,
        siteName: input.siteName,
        byline: input.byline,
        type: "article",
        relevance: input.relevance,
        wordCount: input.wordCount,
    };
}

function readyStage(): TrackStageState {
    return {
        status: "ready",
        updatedAt: nowIso(),
        expiresAt: futureIso(60),
    };
}

function nowIso() {
    return new Date().toISOString();
}

function futureIso(minutes: number) {
    return new Date(Date.now() + minutes * 60_000).toISOString();
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitSummaryIntoChunks(summaryText: string) {
    if (!summaryText) return [""];

    const midpoint = Math.max(1, Math.floor(summaryText.length / 2));
    return [summaryText.slice(0, midpoint), summaryText.slice(midpoint)].filter(Boolean);
}
