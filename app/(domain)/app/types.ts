import { Album, Artist, TopTracksResult, Track } from "@spotify/web-api-ts-sdk";

export type TrackPaletteSwatch = {
    rgb: number[];
    hex?: string;
};

export type TrackPalette = {
    [key: string]: TrackPaletteSwatch | undefined;
};

export type TrackMetadataRecord = {
    track?: Track;
    album?: Album;
    artists?: Artist[];
    siblingAlbums?: Album[];
    topTracks?: TopTracksResult[];
    palette?: TrackPalette;
} | null;

export type ArticleSearchResult = {
    title: string;
    link: string;
    snippet?: string;
    relevance?: string;
    type?: string;
} | undefined;

export type ReadabilityResult = {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
} | undefined;

export type CompleteArticle = {
    link: string;
    title: string;
    content?: string;
    excerpt: string;
    excerptHash?: string;
    siteName: string;
    publishedTime?: string;
    byline: string;
    image?: string;
    gradient?: string;
    type: string;
    relevance: string;
    wordCount: number;
    updatedAt?: string;
};

export type TrackStageName = "metadata" | "articles" | "summary";

export type TrackStageStatus = "idle" | "loading" | "ready" | "error";

export type TrackStageState = {
    status: TrackStageStatus;
    updatedAt?: string;
    expiresAt?: string;
    message?: string;
};

export type TrackStatusMap = Record<TrackStageName, TrackStageState>;

export type TrackLastError = {
    stage: TrackStageName;
    message: string;
    at: string;
    retryable?: boolean;
};

export type TrackSummaryRecord = {
    text: string;
    model: string;
    promptVersion: string;
    inputHash: string;
    updatedAt: string;
    expiresAt?: string;
};

export type PersistedTrackRecord = {
    trackId: string;
    metadata?: TrackMetadataRecord;
    metadataHash?: string;
    articles?: CompleteArticle[];
    articlesHash?: string;
    summary?: TrackSummaryRecord;
    status: TrackStatusMap;
    lastError?: TrackLastError;
    failureHistory?: TrackLastError[];
    createdAt: string;
    updatedAt: string;
};

export type TrackView = {
    trackId: string;
    metadata?: TrackMetadataRecord;
    articles: CompleteArticle[];
    summary?: string;
    status: TrackStatusMap;
    lastError?: TrackLastError;
    needsRefresh: Record<TrackStageName, boolean>;
};

export type TrackRefreshRequest = {
    stage: TrackStageName;
    force?: boolean;
};

export type TrackApiArticle = Omit<CompleteArticle, "content"> & {
    content?: undefined;
};

export type TrackApiView = {
    trackId: string;
    metadata?: TrackMetadataRecord;
    articles: TrackApiArticle[];
    summary?: string;
    status: TrackStatusMap;
    lastError?: TrackLastError;
    needsRefresh: Record<TrackStageName, boolean>;
};

export type TrackSummaryStreamRequest = {
    force?: boolean;
};

export type TrackSummaryStreamEvent =
    | { type: "delta"; delta: string }
    | { type: "complete"; view: TrackApiView }
    | { type: "error"; error: string };
