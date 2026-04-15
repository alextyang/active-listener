import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import { CompleteArticle, PersistedTrackRecord, TrackMetadataRecord } from "../app/types";

const repositoryState = new Map<string, PersistedTrackRecord>();
const cacheState = new Map<string, unknown>();
const repositoryGet = vi.fn(async (trackId: string) => repositoryState.get(trackId));
const repositorySet = vi.fn(async (record: PersistedTrackRecord) => {
    repositoryState.set(record.trackId, record);
});
const cacheGet = vi.fn(async (key: string) => cacheState.get(key));
const cacheSet = vi.fn(async (key: string, value: unknown) => {
    cacheState.set(key, value);
});
const cacheDel = vi.fn(async (key: string) => {
    cacheState.delete(key);
});
const cacheAcquireLock = vi.fn(async () => true);
const cacheReleaseLock = vi.fn(async () => undefined);

const metadata: TrackMetadataRecord = {
    track: {
        id: "track-1",
        name: "Track 1",
        album: { id: "album-1", name: "Album 1", images: [] },
        artists: [{ id: "artist-1", name: "Artist 1" }],
    } as any,
};

const firstArticles: CompleteArticle[] = [{
    link: "https://example.com/a",
    title: "A",
    content: "A",
    excerpt: "A",
    excerptHash: "hash-a",
    siteName: "Example",
    byline: "Author",
    type: "article",
    relevance: "track",
    wordCount: 100,
    updatedAt: "2026-04-13T00:00:00.000Z",
}];

const secondArticles: CompleteArticle[] = [{
    ...firstArticles[0],
    title: "B",
    excerpt: "B",
    excerptHash: "hash-b",
    updatedAt: "2026-04-14T00:00:00.000Z",
}];

vi.mock("./trackRepository", () => ({
    getTrackRepository: () => ({
        get: repositoryGet,
        set: repositorySet,
    }),
}));

vi.mock("./cacheStore", () => ({
    getCacheStore: () => ({
        get: cacheGet,
        set: cacheSet,
        del: cacheDel,
        acquireLock: cacheAcquireLock,
        releaseLock: cacheReleaseLock,
    }),
}));

const fetchTrackMetadata = vi.fn(async () => metadata);
const fetchTrackArticles = vi.fn()
    .mockResolvedValueOnce(firstArticles)
    .mockResolvedValueOnce(secondArticles);
const generateTrackSummary = vi.fn(async () => "summary text");
const streamTrackSummary = vi.fn(async (_metadata: TrackMetadataRecord, _articles: CompleteArticle[], onDelta?: (delta: string) => void | Promise<void>) => {
    await onDelta?.("summary ");
    await onDelta?.("text");
    return "summary text";
});
const buildSummaryInputHash = vi.fn((_metadata: TrackMetadataRecord, articles: CompleteArticle[]) => articles.map((article) => article.excerptHash).join(","));

vi.mock("./spotifyService", () => ({
    fetchTrackMetadata,
}));

vi.mock("./articleService", () => ({
    fetchTrackArticles,
}));

vi.mock("./summaryService", () => ({
    buildSummaryInputHash,
    generateTrackSummary,
    streamTrackSummary,
}));

describe("refreshTrackStage", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-13T00:00:00.000Z"));
        repositoryState.clear();
        cacheState.clear();
        repositoryGet.mockClear();
        repositorySet.mockClear();
        cacheGet.mockClear();
        cacheSet.mockClear();
        cacheDel.mockClear();
        cacheAcquireLock.mockReset();
        cacheAcquireLock.mockResolvedValue(true);
        cacheReleaseLock.mockClear();
        fetchTrackMetadata.mockClear();
        fetchTrackArticles.mockClear();
        fetchTrackArticles.mockResolvedValueOnce(firstArticles).mockResolvedValueOnce(secondArticles);
        generateTrackSummary.mockClear();
        generateTrackSummary.mockResolvedValue("summary text");
        streamTrackSummary.mockClear();
        streamTrackSummary.mockImplementation(async (_metadata: TrackMetadataRecord, _articles: CompleteArticle[], onDelta?: (delta: string) => void | Promise<void>) => {
            await onDelta?.("summary ");
            await onDelta?.("text");
            return "summary text";
        });
        buildSummaryInputHash.mockClear();
        buildSummaryInputHash.mockImplementation((_metadata: TrackMetadataRecord, articles: CompleteArticle[]) => articles.map((article) => article.excerptHash).join(","));
    });

    it("invalidates the cached summary when refreshed articles change", async () => {
        const { refreshTrackStage } = await import("./trackService");

        await refreshTrackStage("track-1", { stage: "summary" });
        const hydratedRecord = repositoryState.get("track-1");
        expect(hydratedRecord?.summary?.text).toBe("summary text");
        expect(hydratedRecord?.status.summary.status).toBe("ready");

        await refreshTrackStage("track-1", { stage: "articles", force: true });
        const refreshedRecord = repositoryState.get("track-1");

        expect(refreshedRecord).toBeDefined();
        expect(refreshedRecord?.articles).toBeDefined();
        expect(refreshedRecord?.articles?.[0]?.excerptHash).toBe("hash-b");
        expect(refreshedRecord?.summary).toBeUndefined();
        expect(refreshedRecord?.status.summary.status).toBe("idle");
    });

    it("persists stage failures in failure history for retries and diagnosis", async () => {
        const { refreshTrackStage } = await import("./trackService");
        generateTrackSummary.mockRejectedValueOnce(new Error("OpenAI unavailable"));

        await refreshTrackStage("track-1", { stage: "summary", force: true });
        const failedRecord = repositoryState.get("track-1");

        expect(failedRecord?.status.summary.status).toBe("error");
        expect(failedRecord?.lastError?.message).toBe("OpenAI unavailable");
        expect(failedRecord?.failureHistory?.at(-1)).toMatchObject({
            stage: "summary",
            message: "OpenAI unavailable",
            retryable: true,
        });
    });

    it("streams summary deltas while persisting the final summary state", async () => {
        const onDelta = vi.fn();
        const { streamTrackSummaryStage } = await import("./trackService");

        const view = await streamTrackSummaryStage("track-1", { force: true }, onDelta);

        expect(onDelta).toHaveBeenNthCalledWith(1, "summary ");
        expect(onDelta).toHaveBeenNthCalledWith(2, "text");
        expect(streamTrackSummary).toHaveBeenCalledOnce();
        expect(view.summary).toBe("summary text");
        expect(repositoryState.get("track-1")?.status.summary.status).toBe("ready");
    });

    it("serves cached track views without hitting the repository", async () => {
        const { getTrackView } = await import("./trackService");
        const cachedView = {
            trackId: "track-1",
            metadata,
            articles: firstArticles,
            summary: "cached summary",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        };
        cacheState.set("track:view:track-1", cachedView);

        await expect(getTrackView("track-1")).resolves.toEqual(cachedView);
        expect(repositoryGet).not.toHaveBeenCalled();
    });

    it("returns the cached track view when a refresh lock is contended", async () => {
        const { refreshTrackStage } = await import("./trackService");
        cacheAcquireLock.mockResolvedValueOnce(false);
        const cachedView = {
            trackId: "track-1",
            metadata,
            articles: firstArticles,
            summary: "cached summary",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        };
        cacheState.set("track:view:track-1", cachedView);

        await expect(refreshTrackStage("track-1", { stage: "summary" })).resolves.toEqual(cachedView);
        expect(fetchTrackMetadata).not.toHaveBeenCalled();
        expect(fetchTrackArticles).not.toHaveBeenCalled();
        expect(generateTrackSummary).not.toHaveBeenCalled();
    });

    it("does not refetch providers when all stages are still fresh", async () => {
        const { refreshTrackStage } = await import("./trackService");
        repositoryState.set("track-1", makeRecord("track-1"));

        const view = await refreshTrackStage("track-1", { stage: "summary" });

        expect(view.summary).toBe("summary text");
        expect(fetchTrackMetadata).not.toHaveBeenCalled();
        expect(fetchTrackArticles).not.toHaveBeenCalled();
        expect(generateTrackSummary).not.toHaveBeenCalled();
    });

    it("refreshes an expired summary even when the input hash is unchanged", async () => {
        const { refreshTrackStage } = await import("./trackService");
        const record = makeRecord("track-1");
        repositoryState.set("track-1", {
            ...record,
            summary: {
                ...record.summary!,
                expiresAt: "2026-04-12T00:00:00.000Z",
            },
            status: {
                ...record.status,
                summary: {
                    ...record.status.summary,
                    expiresAt: "2026-04-12T00:00:00.000Z",
                },
            },
        });

        const view = await refreshTrackStage("track-1", { stage: "summary" });

        expect(generateTrackSummary).toHaveBeenCalledTimes(1);
        expect(view.summary).toBe("summary text");
        expect(repositoryState.get("track-1")?.status.summary.status).toBe("ready");
    });

    it("refreshes expired metadata and invalidates downstream stages when the track changes", async () => {
        const { refreshTrackStage } = await import("./trackService");
        const record = makeRecord("track-1");
        repositoryState.set("track-1", {
            ...record,
            status: {
                ...record.status,
                metadata: {
                    ...record.status.metadata,
                    expiresAt: "2026-04-12T00:00:00.000Z",
                },
            },
        });
        fetchTrackMetadata.mockResolvedValueOnce({
            ...metadata,
            track: {
                ...metadata.track!,
                name: "Track 1 (Remastered)",
            } as any,
        });

        const view = await refreshTrackStage("track-1", { stage: "metadata" });

        expect(fetchTrackMetadata).toHaveBeenCalledTimes(1);
        expect(view.metadata?.track?.name).toBe("Track 1 (Remastered)");
        expect(repositoryState.get("track-1")?.articles).toEqual([]);
        expect(repositoryState.get("track-1")?.summary).toBeUndefined();
        expect(repositoryState.get("track-1")?.status.articles.status).toBe("idle");
        expect(repositoryState.get("track-1")?.status.summary.status).toBe("idle");
    });

    it("refreshes expired articles without discarding the summary when article hashes are unchanged", async () => {
        const { refreshTrackStage } = await import("./trackService");
        const record = makeRecord("track-1");
        fetchTrackArticles.mockReset();
        fetchTrackArticles.mockResolvedValueOnce(firstArticles);
        repositoryState.set("track-1", {
            ...record,
            articlesHash: hashArticles(firstArticles),
            status: {
                ...record.status,
                articles: {
                    ...record.status.articles,
                    expiresAt: "2026-04-12T00:00:00.000Z",
                },
            },
        });

        const view = await refreshTrackStage("track-1", { stage: "articles" });

        expect(fetchTrackArticles).toHaveBeenCalledTimes(1);
        expect(view.summary).toBe("summary text");
        expect(repositoryState.get("track-1")?.summary?.text).toBe("summary text");
        expect(repositoryState.get("track-1")?.status.summary.status).toBe("ready");
    });

    it("caps failure history at the ten most recent entries", async () => {
        const { refreshTrackStage } = await import("./trackService");
        const record = makeRecord("track-1");
        repositoryState.set("track-1", {
            ...record,
            failureHistory: Array.from({ length: 10 }, (_, index) => ({
                stage: "summary",
                message: `Old failure ${index}`,
                at: `2026-04-12T00:00:0${index}.000Z`,
                retryable: true,
            })),
        });
        generateTrackSummary.mockRejectedValueOnce(new Error("Newest failure"));

        await refreshTrackStage("track-1", { stage: "summary", force: true });
        const failedRecord = repositoryState.get("track-1");

        expect(failedRecord?.failureHistory).toHaveLength(10);
        expect(failedRecord?.failureHistory?.[0]?.message).toBe("Old failure 1");
        expect(failedRecord?.failureHistory?.at(-1)?.message).toBe("Newest failure");
    });
});

function makeRecord(trackId: string): PersistedTrackRecord {
    return {
        trackId,
        metadata,
        metadataHash: "metadata-hash",
        articles: firstArticles,
        articlesHash: hashArticles(firstArticles),
        summary: {
            text: "summary text",
            model: "gpt-4o-mini",
            promptVersion: "2026-04-v1",
            inputHash: firstArticles.map((article) => article.excerptHash).join(","),
            updatedAt: "2026-04-13T00:00:00.000Z",
            expiresAt: "2026-04-20T00:00:00.000Z",
        },
        status: {
            metadata: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z", expiresAt: "2026-04-20T00:00:00.000Z" },
            articles: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z", expiresAt: "2026-04-14T00:00:00.000Z" },
            summary: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z", expiresAt: "2026-04-20T00:00:00.000Z" },
        },
        failureHistory: [],
        createdAt: "2026-04-13T00:00:00.000Z",
        updatedAt: "2026-04-13T00:00:00.000Z",
    };
}

function hashArticles(articles: CompleteArticle[]) {
    return createHash("sha256").update(JSON.stringify(articles.map((article) => ({
        link: article.link,
        excerptHash: article.excerptHash,
        updatedAt: article.updatedAt,
        relevance: article.relevance,
    })))).digest("hex");
}
