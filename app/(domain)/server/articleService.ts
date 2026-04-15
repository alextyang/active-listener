import { createHash } from "crypto";
import { Track } from "@spotify/web-api-ts-sdk";
import { ARTICLE_EXCERPT_MAX_CHARS, ARTICLE_POPULATE_CONCURRENCY, ARTICLE_REQUEST_TIMEOUT_MS, ARTICLE_SEARCH_URL, ARTIST_SEARCH_QUERY, DEFAULT_ARTICLE_RELEVANCE, DEFAULT_ARTICLE_TYPE, MINIMUM_WORD_COUNT, WIKIPEDIA_POPULATE_URL } from "../app/config";
import { CompleteArticle, ArticleSearchResult, TrackMetadataRecord } from "../app/types";
import { assignType, filterArticlesForRelevance, trimByline, trimSiteName, trimTitle, trimWikipediaText } from "../app/articles/helpers";
import { findOpenGraphImage, htmlToDocument } from "../utilities/document";
import { parseReadableArticle } from "../utilities/readability";
import { isTrackSingle } from "../music/metadata";
import { fetchJson, fetchText } from "./http";
import { getServerEnv } from "./env";

export async function fetchTrackArticles(metadata: TrackMetadataRecord): Promise<CompleteArticle[]> {
    const track = metadata?.track;
    if (!track) return [];

    const searchResults = filterArticlesForRelevance(await searchTrackArticles(track), track) as ArticleSearchResult[];
    const populated = await mapWithConcurrency(searchResults, ARTICLE_POPULATE_CONCURRENCY, populateArticle);

    return filterArticlesForRelevance(populated.filter(Boolean) as CompleteArticle[], track) as CompleteArticle[];
}

async function searchTrackArticles(track: Track): Promise<ArticleSearchResult[]> {
    const artistNames = track.artists.map((artist) => artist.name).join(" ");
    const albumName = track.album.name;

    const results = (await Promise.all([
        searchGoogleArticles(`${track.name} ${artistNames}`),
        isTrackSingle(track.name, albumName) ? searchGoogleArticles(`${albumName} ${artistNames}`) : Promise.resolve([]),
        searchGoogleArticles(`${artistNames} ${ARTIST_SEARCH_QUERY}`),
    ])).flat();

    return results.filter(Boolean);
}

async function searchGoogleArticles(query: string): Promise<ArticleSearchResult[]> {
    const env = getServerEnv();
    if (!env.GOOGLE_API_KEY || !env.GOOGLE_SEARCH_ENGINE_ID)
        throw new Error("Google Custom Search credentials are not configured.");

    const response = await fetchJson<{ items?: ArticleSearchResult[] }>(ARTICLE_SEARCH_URL, {
        q: query,
        cx: env.GOOGLE_SEARCH_ENGINE_ID,
        key: env.GOOGLE_API_KEY,
    }, {
        timeoutMs: ARTICLE_REQUEST_TIMEOUT_MS,
    });

    return response?.items ?? [];
}

async function populateArticle(article: ArticleSearchResult): Promise<CompleteArticle | undefined> {
    if (!article) return undefined;

    const normalizedArticle = (!article.type || !article.relevance)
        ? filterArticlesForRelevance([article])[0]
        : article;
    if (!normalizedArticle) return undefined;

    const html = await fetchArticleHtml(normalizedArticle);
    if (!html) return buildFallbackArticle(normalizedArticle);

    const doc = htmlToDocument(html);
    let readability = parseReadableArticle(doc);
    if (normalizedArticle.type === "wikipedia")
        readability = trimWikipediaText(readability);
    if (!readability) return buildFallbackArticle(normalizedArticle);

    const textContent = readability.textContent.replace(/\s+/g, " ").trim();
    if (!textContent) return buildFallbackArticle(normalizedArticle);

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    if (wordCount < MINIMUM_WORD_COUNT) {
        const fallbackArticle = buildFallbackArticle(normalizedArticle);
        if (fallbackArticle)
            return fallbackArticle;
    }

    const excerpt = textContent.slice(0, ARTICLE_EXCERPT_MAX_CHARS);
    const siteName = trimSiteName(normalizedArticle.link, readability.siteName);
    const title = trimTitle(normalizedArticle.title, readability.title, siteName);
    const image = findOpenGraphImage(html);
    const byline = trimByline(readability.byline);

    return {
        link: normalizedArticle.link,
        title,
        content: excerpt,
        excerpt,
        excerptHash: createHash("sha256").update(excerpt).digest("hex"),
        siteName,
        publishedTime: readability.publishedTime,
        byline,
        image,
        type: normalizedArticle.type ?? DEFAULT_ARTICLE_TYPE,
        relevance: normalizedArticle.relevance ?? DEFAULT_ARTICLE_RELEVANCE,
        wordCount,
        updatedAt: new Date().toISOString(),
    };
}

export function buildFallbackArticle(article: ArticleSearchResult): CompleteArticle | undefined {
    if (!article?.snippet) return undefined;

    const excerpt = article.snippet.replace(/\s+/g, " ").trim().slice(0, ARTICLE_EXCERPT_MAX_CHARS);
    if (!excerpt) return undefined;

    const siteName = trimSiteName(article.link, "");
    return {
        link: article.link,
        title: trimTitle(article.title, article.title, siteName),
        excerpt,
        content: excerpt,
        excerptHash: createHash("sha256").update(excerpt).digest("hex"),
        siteName,
        byline: "",
        type: article.type ?? DEFAULT_ARTICLE_TYPE,
        relevance: article.relevance ?? DEFAULT_ARTICLE_RELEVANCE,
        wordCount: excerpt.split(/\s+/).filter(Boolean).length,
        updatedAt: new Date().toISOString(),
    };
}

async function fetchArticleHtml(article: ArticleSearchResult): Promise<string | undefined> {
    if (!article) return undefined;
    if (article.type === "wikipedia") return fetchWikipediaArticle(article);

    return fetchText(article.link, {}, {
        timeoutMs: ARTICLE_REQUEST_TIMEOUT_MS,
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ActiveListener/0.3.0; +https://alexya.ng)",
        },
    });
}

async function fetchWikipediaArticle(article: ArticleSearchResult): Promise<string | undefined> {
    if (!article || article.type !== "wikipedia") return undefined;

    const pageName = article.link.split("/").pop();
    const results = await fetchJson<any>(WIKIPEDIA_POPULATE_URL, {
        action: "query",
        prop: "extracts",
        titles: pageName,
        explaintext: "true",
        format: "json",
    }, {
        timeoutMs: ARTICLE_REQUEST_TIMEOUT_MS,
    });

    const pageKey = results?.query?.pages ? Object.keys(results.query.pages)[0] : undefined;
    return pageKey ? results.query.pages[pageKey]?.extract : undefined;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R | undefined>): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
        while (index < items.length) {
            const currentIndex = index++;
            const result = await worker(items[currentIndex]);
            if (result !== undefined)
                results.push(result);
        }
    });

    await Promise.all(runners);
    return results;
}
