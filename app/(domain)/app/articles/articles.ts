import { ARTICLE_RELEVANCE_ORDER, ARTICLE_SEARCH_API_ROUTE, BLACKLISTED_KEYWORDS, CURRENT_URL, DEBUG_ARTICLE_FILTER, INTERNAL_FETCH_SETTINGS, MINIMUM_WORD_COUNT, WHITELISTED_KEYWORDS, ARTICLE_POPULATE_API_ROUTE, ARTICLE_BATCH_SIZE, DEBUG_ARTICLE_POPULATE, DEBUG_ARTICLE_SEARCH } from "../config";
import { ArticleSearchResult, CompleteArticle, SimpleArticle } from "@/app/(domain)/app/types";
import { Track } from "@spotify/web-api-ts-sdk";
import { TrackSyncState } from "../context";
import { fetchInternalResource, fetchResource } from "../../utilities/fetch";
import { compressString } from "../../utilities/compress";





export async function getArticles(track: Track, updateSyncState?: (state: TrackSyncState) => void): Promise<(CompleteArticle)[]> {
    if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLE-SEARCH] Searching for articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' '));
    if (updateSyncState) updateSyncState({ state: 'articles', percent: -1 });
    let searchResults = await searchArticles(track);

    searchResults = filterArticlesForRelevance(searchResults, track);

    if (searchResults.length === 0) {
        if (updateSyncState) updateSyncState({ state: 'idle', percent: -1 });
        if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLES-SEARCH] No articles found for', track);
        return [];
    }

    const articleCount = searchResults.length;
    const articleBatches = [];
    while (searchResults.length > 0)
        articleBatches.push(searchResults.splice(0, ARTICLE_BATCH_SIZE));

    if (DEBUG_ARTICLE_POPULATE) console.log('[ARTICLE-POPULATE] Populating articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' ') + ': ' + articleCount + ' articles in ' + articleBatches.length + ' batches' + articleBatches.map((batch) => '\n\n\n\t' + batch.map((article) => article?.title).join('\n\t')));

    const articles: (CompleteArticle | undefined)[] = [];
    await Promise.all(articleBatches.map((batch) => populateArticleBatch(batch, articles, articleCount, updateSyncState)));

    if (updateSyncState) updateSyncState({ state: 'idle', percent: -1 });
    const filteredArticles = filterArticlesForRelevance(articles, track);
    if (!filteredArticles) return [];
    return filteredArticles as CompleteArticle[];
}

async function populateArticleBatch(batch: ArticleSearchResult[], articles: (CompleteArticle | undefined)[], articleCount?: number, updateSyncState?: (state: TrackSyncState) => void): Promise<void> {
    const populatedArticles = await populateArticles(batch);
    if (populatedArticles) articles.push(...populatedArticles);
    if (updateSyncState && articleCount) updateSyncState({ state: 'articles', percent: (articles.length * 100 / articleCount) });
    if (DEBUG_ARTICLE_POPULATE) console.log('[ARTICLE-POPULATE] Downloaded articles ( ' + articles.length + ' / ' + articleCount + ' ):\n\t' + populatedArticles?.map((article) => article?.title).join('\n\t'));
    return;
}

async function populateArticles(initialArticles: ArticleSearchResult[]): Promise<(CompleteArticle | undefined)[]> {
    const populatedArticles = await fetchInternalResource<CompleteArticle[]>(ARTICLE_POPULATE_API_ROUTE, simplifyArticleResults(initialArticles));
    if (!populatedArticles) return [];
    return populatedArticles;
}

async function searchArticles(track: Track): Promise<ArticleSearchResult[]> {
    const results = await fetchInternalResource<ArticleSearchResult[]>(ARTICLE_SEARCH_API_ROUTE, track);
    if (!results) return [];
    if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLE-SEARCH] Found ' + results.length + ' articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(', ') + ': ' + results.map((result) => '\n\t' + result?.title));
    return results;
}

function simplifyArticleResults(articles: (ArticleSearchResult)[]): ArticleSearchResult[] {
    return articles.map((article) => {
        if (!article) return undefined;
        return {
            title: article.title,
            link: article.link,
            type: article.type,
            relevance: article.relevance
        };
    }).filter((article) => article !== undefined) as ArticleSearchResult[];
}




export function filterArticlesForRelevance(articles?: (ArticleSearchResult | CompleteArticle)[], track?: Track): (ArticleSearchResult | CompleteArticle)[] {
    if (!articles || !track) return [];
    const filteredArticles: (ArticleSearchResult | CompleteArticle)[] = [];

    articles.forEach((article, index) => {
        const artistNames = track.artists.map((artist) => artist.name.toLowerCase()).map((name) => name.split(' ')).flat();
        if (article && article.link) {
            const title = article.title.toLowerCase();
            let relevance = '';

            // Blacklist keywords in title
            if (BLACKLISTED_KEYWORDS.some((keyword) => title.includes(keyword)))
                return;

            // Ignore articles with too few words
            if ('wordCount' in article && article.wordCount < MINIMUM_WORD_COUNT)
                return;

            // Ignore duplicates
            if (filteredArticles.some((filteredArticle) => filteredArticle?.title === article.title) || filteredArticles.some((filteredArticle) => filteredArticle?.link === article.link))
                return;

            // Mark category of relevance
            if (title.includes(track.name.toLowerCase()))
                relevance = 'track';
            else if (title.includes(track.album.name.toLowerCase()))
                relevance = 'album';
            else if (artistNames.some((name) => title.includes(name)))
                relevance = 'artist';

            if (relevance.length > 0)
                filteredArticles.push({ ...article, relevance, type: assignType(article) });
            return;
        }
    });

    const ignoredArticles = articles.filter((article) => !filteredArticles.includes(article as { title: string, link: string }));
    if (DEBUG_ARTICLE_FILTER) console.log(`[ARTICLE-FILTER] Ignoring ${(articles.length - filteredArticles.length)} articles:${ignoredArticles.map((article) => '\n\t' + article?.title)}`);

    return sortArticles(filteredArticles);
}

export function assignType(article: (ArticleSearchResult | CompleteArticle)): string {
    if (!article) return 'article';
    if (article.link.includes('wikipedia')) return 'wikipedia';
    if (article.link.includes('genius')) return 'genius';
    return 'article';
}

function sortArticles(articles: (ArticleSearchResult | CompleteArticle)[]): (ArticleSearchResult | CompleteArticle)[] {
    return articles.sort((a, b) => {
        // Put less specific articles at the end
        let aScore = ARTICLE_RELEVANCE_ORDER.indexOf(a?.relevance ?? 'artist');
        let bScore = ARTICLE_RELEVANCE_ORDER.indexOf(b?.relevance ?? 'artist');

        const aTitle = a?.title.toLowerCase();
        const bTitle = b?.title.toLowerCase();

        // Put hidden articles at the end
        if (a?.type === 'wikipedia' || a?.type === 'genius')
            aScore += 100;
        if (b?.type === 'wikipedia' || b?.type === 'genius')
            bScore += 100;

        if (aScore === bScore) {
            // Put articles with the words 'review' or 'interview' at the start of each section
            if (WHITELISTED_KEYWORDS.some((keyword) => aTitle?.includes(keyword)))
                aScore -= 0.1;
            if (WHITELISTED_KEYWORDS.some((keyword) => bTitle?.includes(keyword)))
                bScore -= 0.1;

            if (a && b && 'wordCount' in a && 'wordCount' in b) {
                if (a?.wordCount > b?.wordCount)
                    aScore -= 0.1;
                else if (a?.wordCount < b?.wordCount)
                    bScore -= 0.1;
            }

        }

        return aScore - bScore;
    });
}

export function simplifyArticles(articles: CompleteArticle[]): SimpleArticle[] {
    return articles.map((article) => simplifyArticle(article));
}

export function simplifyArticle(article: CompleteArticle): SimpleArticle {
    return {
        title: article.title,
        byline: article.byline,
        siteName: article.siteName,
        compressedContent: compressString(article.content)
    }
}