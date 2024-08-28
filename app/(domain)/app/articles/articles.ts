import { ARTICLE_RELEVANCE_ORDER, ARTICLE_SEARCH_API_ROUTE, BLACKLISTED_KEYWORDS, CURRENT_URL, DEBUG_ARTICLE_FILTER, INTERNAL_FETCH_SETTINGS, MINIMUM_WORD_COUNT, WHITELISTED_KEYWORDS, ARTICLE_POPULATE_API_ROUTE, ARTICLE_BATCH_SIZE, DEBUG_ARTICLE_POPULATE, DEBUG_ARTICLE_SEARCH, CACHE_ARTICLES_KEY, DEFAULT_ARTICLE_BG, ARTICLE_BG_DARKEN, DEFAULT_ARTICLE_FG, ARTICLE_FG_LIGHTEN, ARTICLE_BG_GRADIENT_OFFSET, ARTICLE_FG_GRADIENT_OFFSET, ARTICLE_BG_OPACITY, ARTICLE_FG_OPACITY, ARTICLE_RELEVANCE_TOKENS, DEFAULT_ARTICLE_RELEVANCE_TOKEN } from "../config";
import { ArticleSearchResult, CompleteArticle, ReadabilityResult, SimpleArticle } from "@/app/(domain)/app/types";
import { Track } from "@spotify/web-api-ts-sdk";
import { TrackSyncState } from "../context";
import { fetchInternalResource, fetchResource } from "../../utilities/fetch";
import { compressString } from "../../utilities/compress";
import { loadTrackProperty, savePropertyToTrack } from "../../site/cache";
import { Palette, Swatch, Vec3 } from "node-vibrant/lib/color";
import { createGradientStyleString, darkenRGB, lightenRGB, rgbaToStyleString } from "../../utilities/colors";

// FETCHING
export async function getArticles(track: Track, updateSyncState?: (state: TrackSyncState) => void): Promise<(CompleteArticle)[]> {
    const cachedArticles = await loadTrackProperty<CompleteArticle[]>(track.id, CACHE_ARTICLES_KEY);
    if (cachedArticles) {
        if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLE-SEARCH] Found cached articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' '));
        if (updateSyncState) updateSyncState({ state: 'articles', percent: 100 });
        return cachedArticles;
    }

    if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLE-SEARCH] Searching for articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' '));
    if (updateSyncState) updateSyncState({ state: 'articles' });
    let searchResults = await searchArticles(track);

    searchResults = filterArticlesForRelevance(searchResults, track);

    if (searchResults.length === 0) {
        if (updateSyncState) updateSyncState({ state: 'articles', percent: 100 });
        if (DEBUG_ARTICLE_SEARCH) console.log('[ARTICLES-SEARCH] No articles found for', track);
        savePropertyToTrack<CompleteArticle[]>(track.id, CACHE_ARTICLES_KEY, []);
        return [];
    }

    const articleCount = searchResults.length;
    const articleBatches = [];
    while (searchResults.length > 0)
        articleBatches.push(searchResults.splice(0, ARTICLE_BATCH_SIZE));

    if (DEBUG_ARTICLE_POPULATE) console.log('[ARTICLE-POPULATE] Populating articles for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' ') + ': ' + articleCount + ' articles in ' + articleBatches.length + ' batches' + articleBatches.map((batch) => '\n\n\n\t' + batch.map((article) => article?.title).join('\n\t')));

    const articles: (CompleteArticle | undefined)[] = [];
    await Promise.all(articleBatches.map((batch) => populateArticleBatch(batch, articles, articleCount, updateSyncState)));

    const filteredArticles = filterArticlesForRelevance(articles, track) as CompleteArticle[];
    if (!filteredArticles) {
        if (DEBUG_ARTICLE_POPULATE) console.log('[ARTICLE-POPULATE] No articles approved for ' + track.name + ' ' + track.artists.map((artist) => artist.name).join(' '));
        if (updateSyncState) updateSyncState({ state: 'articles', percent: 100 });
        savePropertyToTrack<CompleteArticle[]>(track.id, CACHE_ARTICLES_KEY, []);
        return [];
    }

    const truncatedArticles = filteredArticles.map((article) => {
        return {
            ...article,
            content: '',
            textContent: '',
        };
    });
    savePropertyToTrack<CompleteArticle[]>(track.id, CACHE_ARTICLES_KEY, truncatedArticles);

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


// TYPE CONVERSIONS
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



// LIST MANAGEMENT
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



// CONTENT RULES
export function assignType(article: (ArticleSearchResult | CompleteArticle)): string {
    if (!article) return 'article';
    if (article.link.includes('wikipedia')) return 'wikipedia';
    if (article.link.includes('genius')) return 'genius';
    return 'article';
}

export function trimTitle(searchResultTitle: string, readabilityTitle: string, siteName: string): string {
    let title = searchResultTitle;
    if (readabilityTitle && readabilityTitle.length > 1) title = readabilityTitle;
    if (title.toLowerCase().includes(siteName.toLowerCase())) {
        title = title.substring(0, title.toLowerCase().indexOf(siteName.toLowerCase()));
    }
    if (title.includes(' - ')) title = title.split(' - ')[0];
    if (title.includes(' | ')) title = title.split(' | ')[0];
    return title.trim();
}

export function trimWikipediaText(readability: ReadabilityResult): ReadabilityResult {
    if (!readability) return undefined;
    readability.textContent = readability.textContent.split('References[edit]')[0];
    readability.content = readability.content.split('<span id="References">References</span>')[0];
    return readability;
}

export function trimByline(byline?: string): string {
    if (!byline) return '';
    return byline.replace(/[^\w\s]/gi, '').replace('By', '').replace('by', '').replace('Words', '').trim();
}

export function trimSiteName(link: string, siteName?: string): string {
    return siteName && siteName.length > 1 ? siteName : (link.split('/')[2].replace('www.', '').split('.')[0].toLocaleUpperCase())
}


// RENDER RULES
export function getRelevanceToken(relevance: string): string {
    return (ARTICLE_RELEVANCE_TOKENS[relevance] ?? DEFAULT_ARTICLE_RELEVANCE_TOKEN);
}

export function getArticleNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
}

export function getTimeToRead(wordCount?: number): string {
    if (!wordCount) return '';
    return (Math.floor(wordCount / 238)) + ':' + (Math.floor((wordCount % 238) / (238 / 60)).toString().padStart(2, '0'));
}

export function getArticleTextGradient(article: CompleteArticle, trackPalette: Palette | undefined, index: number): string {
    if (article.gradient) return article.gradient;
    return getDefaultArticleForeground(index, trackPalette);
}

export function getArticleBackgroundGradient(trackPalette: Palette | undefined, index: number): string {
    return getDefaultArticleBackground(index, trackPalette);
}


// COLORS
export function getDefaultArticleBackground(index: number, trackPalette?: Palette) {
    if (!trackPalette) return DEFAULT_ARTICLE_BG;

    const options = Object.values(trackPalette).filter((swatch) => swatch !== undefined && swatch.rgb);
    if (options.length === 0) return DEFAULT_ARTICLE_BG;

    const swatch = options[index % options.length];
    if (!swatch || !swatch.rgb) return DEFAULT_ARTICLE_BG;

    const rgb = swatch.rgb.flat();
    const darkened = darkenRGB(rgb, ARTICLE_BG_DARKEN);
    const darkened2 = darkenRGB(rgb, ARTICLE_BG_GRADIENT_OFFSET);
    const angle = index * 200 % 360;

    return createGradientStyleString(rgbaToStyleString([...darkened, ARTICLE_BG_OPACITY]), rgbaToStyleString([...darkened2, ARTICLE_BG_OPACITY]), angle, 0, 200);
}

export function getDefaultArticleForeground(index: number, trackPalette?: Palette) {
    if (!trackPalette) return DEFAULT_ARTICLE_FG;

    const options = Object.values(trackPalette).filter((swatch) => swatch !== undefined && swatch.rgb);
    if (options.length === 0) return DEFAULT_ARTICLE_FG;

    const swatch = options[index % options.length];
    if (!swatch || !swatch.rgb) return DEFAULT_ARTICLE_FG;

    const rgb = swatch.rgb.flat();
    const lightened = lightenRGB(rgb, ARTICLE_FG_LIGHTEN);
    const lightened2 = lightenRGB(rgb, ARTICLE_FG_GRADIENT_OFFSET);
    const angle = index * 200 % 360 + 180;

    return createGradientStyleString(rgbaToStyleString([...lightened, ARTICLE_FG_OPACITY]), rgbaToStyleString([...lightened2, ARTICLE_FG_OPACITY]), angle, 0, 100);
}




