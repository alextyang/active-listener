import { createHash } from "crypto";
import { DEBUG_TRACK_RUNTIME, SUMMARY_MODEL, SUMMARY_PROMPT_VERSION, TRACK_ARTICLES_TTL_MS, TRACK_METADATA_TTL_MS, TRACK_REFRESH_LOCK_TTL_SECONDS, TRACK_RUNTIME_CACHE_TTL_SECONDS, TRACK_SUMMARY_TTL_MS } from "../app/config";
import { CompleteArticle, PersistedTrackRecord, TrackLastError, TrackMetadataRecord, TrackRefreshRequest, TrackStageName, TrackStageState, TrackSummaryRecord, TrackView } from "../app/types";
import { fetchTrackArticles } from "./articleService";
import { getCacheStore } from "./cacheStore";
import { createRequestId, logTrackError, logTrackEvent } from "./observability";
import { fetchTrackMetadata } from "./spotifyService";
import { getTrackRepository } from "./trackRepository";
import { buildSummaryInputHash, generateTrackSummary, streamTrackSummary } from "./summaryService";

const TRACK_VIEW_CACHE_PREFIX = "track:view:";
const TRACK_LOCK_PREFIX = "track:lock:";
const FAILURE_HISTORY_LIMIT = 10;

export async function getTrackView(trackId: string): Promise<TrackView> {
    const cache = getCacheStore();
    const cacheKey = `${TRACK_VIEW_CACHE_PREFIX}${trackId}`;
    const cached = await cache.get<TrackView>(cacheKey);
    if (cached) {
        logTrackEvent({
            event: "track.view.cache_hit",
            requestId: createRequestId(),
            trackId,
            cache: "track-view",
        });
        return cached;
    }

    const record = await getTrackRepository().get(trackId) ?? createEmptyRecord(trackId);
    const view = toTrackView(record);
    await cache.set(cacheKey, view, TRACK_RUNTIME_CACHE_TTL_SECONDS);
    logTrackEvent({
        event: "track.view.cache_miss",
        requestId: createRequestId(),
        trackId,
        cache: "track-view",
    });
    return view;
}

export async function refreshTrackStage(trackId: string, request: TrackRefreshRequest): Promise<TrackView> {
    return runTrackStageRefresh(trackId, request, async (record) => {
        if (request.stage === "metadata")
            return runMetadataStage(record, request.force ?? false);
        if (request.stage === "articles")
            return runArticlesStage(record, request.force ?? false);
        return runSummaryStage(record, request.force ?? false);
    });
}

export async function streamTrackSummaryStage(
    trackId: string,
    request: { force?: boolean },
    onDelta: (delta: string) => void | Promise<void>,
): Promise<TrackView> {
    return runTrackStageRefresh(trackId, { stage: "summary", force: request.force }, async (record) => {
        return runSummaryStageInternal(record, request.force ?? false, onDelta);
    });
}

async function runTrackStageRefresh(
    trackId: string,
    request: TrackRefreshRequest,
    runStage: (record: PersistedTrackRecord) => Promise<PersistedTrackRecord>,
): Promise<TrackView> {
    const cache = getCacheStore();
    const lockKey = `${TRACK_LOCK_PREFIX}${trackId}:${request.stage}`;
    const acquired = await cache.acquireLock(lockKey, TRACK_REFRESH_LOCK_TTL_SECONDS);
    if (!acquired) {
        logTrackEvent({
            event: "track.refresh.lock_contended",
            requestId: createRequestId(),
            trackId,
            stage: request.stage,
            lock: lockKey,
        });
        return getTrackView(trackId);
    }

    try {
        let record = await getTrackRepository().get(trackId) ?? createEmptyRecord(trackId);
        const requestId = createRequestId();
        const startedAt = Date.now();

        logTrackEvent({
            event: "track.refresh.start",
            requestId,
            trackId,
            stage: request.stage,
            message: request.force ? "forced" : "auto",
        });

        record = await runStage(record);

        await saveRecord(record);
        logTrackEvent({
            event: "track.refresh.complete",
            requestId,
            trackId,
            stage: request.stage,
            durationMs: Date.now() - startedAt,
            message: record.status[request.stage]?.status ?? "unknown",
        });
        return toTrackView(record);
    } finally {
        await cache.releaseLock(lockKey);
    }
}

function createEmptyRecord(trackId: string): PersistedTrackRecord {
    const now = new Date().toISOString();
    return {
        trackId,
        metadata: undefined,
        metadataHash: undefined,
        articles: [],
        articlesHash: undefined,
        summary: undefined,
        status: {
            metadata: { status: "idle" },
            articles: { status: "idle" },
            summary: { status: "idle" },
        },
        failureHistory: [],
        createdAt: now,
        updatedAt: now,
    };
}

async function runMetadataStage(record: PersistedTrackRecord, force: boolean): Promise<PersistedTrackRecord> {
    if (!needsMetadataRefresh(record, force))
        return record;

    record = markStageLoading(record, "metadata", "Syncing track metadata...");
    await saveRecord(record);

    try {
        const metadata = await fetchTrackMetadata(record.trackId);
        const metadataHash = hashValue(metadata);
        const metadataChanged = record.metadataHash !== metadataHash;

        const nextRecord: PersistedTrackRecord = {
            ...record,
            metadata,
            metadataHash,
            lastError: clearLastError(record.lastError, "metadata"),
            status: {
                ...record.status,
                metadata: markStageReady(TRACK_METADATA_TTL_MS),
                articles: metadataChanged ? { status: "idle" } : record.status.articles,
                summary: metadataChanged ? { status: "idle" } : record.status.summary,
            },
            articles: metadataChanged ? [] : record.articles,
            articlesHash: metadataChanged ? undefined : record.articlesHash,
            summary: metadataChanged ? undefined : record.summary,
        };

        return nextRecord;
    } catch (error) {
        logTrackError({
            event: "track.stage.error",
            requestId: createRequestId(),
            trackId: record.trackId,
            stage: "metadata",
            error,
        });
        return markStageError(record, "metadata", error);
    }
}

async function runArticlesStage(record: PersistedTrackRecord, force: boolean): Promise<PersistedTrackRecord> {
    record = await runMetadataStage(record, false);
    if (!record.metadata?.track)
        return record;
    if (!needsArticlesRefresh(record, force))
        return record;

    record = markStageLoading(record, "articles", "Finding reviews for track...");
    await saveRecord(record);

    try {
        const metadata = record.metadata!;
        const articles = await fetchTrackArticles(metadata);
        const articlesHash = hashValue(articles.map((article) => ({
            link: article.link,
            excerptHash: article.excerptHash,
            updatedAt: article.updatedAt,
            relevance: article.relevance,
        })));
        const articlesChanged = record.articlesHash !== articlesHash;

        const nextRecord: PersistedTrackRecord = {
            ...record,
            articles,
            articlesHash,
            lastError: clearLastError(record.lastError, "articles"),
            status: {
                ...record.status,
                articles: markStageReady(TRACK_ARTICLES_TTL_MS),
                summary: articlesChanged ? { status: "idle" } : record.status.summary,
            },
            summary: articlesChanged ? undefined : record.summary,
        };

        return nextRecord;
    } catch (error) {
        logTrackError({
            event: "track.stage.error",
            requestId: createRequestId(),
            trackId: record.trackId,
            stage: "articles",
            error,
        });
        return markStageError(record, "articles", error);
    }
}

async function runSummaryStage(record: PersistedTrackRecord, force: boolean): Promise<PersistedTrackRecord> {
    return runSummaryStageInternal(record, force, undefined);
}

async function runSummaryStageInternal(
    record: PersistedTrackRecord,
    force: boolean,
    onDelta?: (delta: string) => void | Promise<void>,
): Promise<PersistedTrackRecord> {
    record = await runArticlesStage(record, false);
    if (!record.metadata?.track)
        return record;
    if (!needsSummaryRefresh(record, force))
        return record;

    record = markStageLoading(record, "summary", "Generating summary...");
    await saveRecord(record);

    try {
        const metadata = record.metadata!;
        const summaryText = onDelta
            ? await streamTrackSummary(metadata, record.articles ?? [], onDelta)
            : await generateTrackSummary(metadata, record.articles ?? []);
        const summary: TrackSummaryRecord = {
            text: summaryText,
            model: SUMMARY_MODEL,
            promptVersion: SUMMARY_PROMPT_VERSION,
            inputHash: buildSummaryInputHash(metadata, record.articles ?? []),
            updatedAt: new Date().toISOString(),
            expiresAt: toExpiry(TRACK_SUMMARY_TTL_MS),
        };

        return {
            ...record,
            summary,
            lastError: clearLastError(record.lastError, "summary"),
            status: {
                ...record.status,
                summary: markStageReady(TRACK_SUMMARY_TTL_MS),
            },
        };
    } catch (error) {
        logTrackError({
            event: "track.stage.error",
            requestId: createRequestId(),
            trackId: record.trackId,
            stage: "summary",
            error,
        });
        return markStageError(record, "summary", error);
    }
}

async function saveRecord(record: PersistedTrackRecord) {
    const normalized: PersistedTrackRecord = {
        ...record,
        updatedAt: new Date().toISOString(),
    };

    await getTrackRepository().set(normalized);

    const view = toTrackView(normalized);
    await getCacheStore().set(`${TRACK_VIEW_CACHE_PREFIX}${normalized.trackId}`, view, TRACK_RUNTIME_CACHE_TTL_SECONDS);
    if (DEBUG_TRACK_RUNTIME)
        logTrackEvent({
            event: "track.record.saved",
            requestId: createRequestId(),
            trackId: normalized.trackId,
            message: normalized.updatedAt,
        });
}

function toTrackView(record: PersistedTrackRecord): TrackView {
    return {
        trackId: record.trackId,
        metadata: record.metadata,
        articles: record.articles ?? [],
        summary: record.summary?.text,
        status: record.status,
        lastError: record.lastError,
        needsRefresh: {
            metadata: needsMetadataRefresh(record, false),
            articles: needsArticlesRefresh(record, false),
            summary: needsSummaryRefresh(record, false),
        },
    };
}

function needsMetadataRefresh(record: PersistedTrackRecord, force: boolean) {
    if (force) return true;
    return !record.metadata || isExpired(record.status.metadata);
}

function needsArticlesRefresh(record: PersistedTrackRecord, force: boolean) {
    if (force) return true;
    if (!record.metadata) return true;
    return !record.articlesHash || isExpired(record.status.articles);
}

function needsSummaryRefresh(record: PersistedTrackRecord, force: boolean) {
    if (force) return true;
    if (!record.metadata) return true;
    const expectedInputHash = buildSummaryInputHash(record.metadata, record.articles ?? []);
    return !record.summary || record.summary.inputHash !== expectedInputHash || isExpired(record.status.summary);
}

function markStageLoading(record: PersistedTrackRecord, stage: TrackStageName, message: string): PersistedTrackRecord {
    return {
        ...record,
        status: {
            ...record.status,
            [stage]: {
                status: "loading",
                updatedAt: new Date().toISOString(),
                message,
            },
        },
    };
}

function markStageReady(ttlMs: number): TrackStageState {
    return {
        status: "ready",
        updatedAt: new Date().toISOString(),
        expiresAt: toExpiry(ttlMs),
    };
}

function markStageError(record: PersistedTrackRecord, stage: TrackStageName, error: unknown): PersistedTrackRecord {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const lastError: TrackLastError = {
        stage,
        message,
        at: new Date().toISOString(),
        retryable: true,
    };

    return {
        ...record,
        lastError,
        failureHistory: appendFailureHistory(record.failureHistory, lastError),
        status: {
            ...record.status,
            [stage]: {
                status: "error",
                updatedAt: lastError.at,
                message,
            },
        },
    };
}

function clearLastError(lastError: TrackLastError | undefined, stage: TrackStageName) {
    if (!lastError || lastError.stage !== stage) return lastError;
    return undefined;
}

function appendFailureHistory(history: TrackLastError[] | undefined, failure: TrackLastError) {
    return [...(history ?? []), failure].slice(-FAILURE_HISTORY_LIMIT);
}

function isExpired(stage: TrackStageState) {
    if (stage.status !== "ready") return true;
    if (!stage.expiresAt) return true;
    return new Date(stage.expiresAt).getTime() <= Date.now();
}

function toExpiry(ttlMs: number) {
    return new Date(Date.now() + ttlMs).toISOString();
}

function hashValue(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
