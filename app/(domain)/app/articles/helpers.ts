import { CompleteArticle, ArticleSearchResult, ReadabilityResult, TrackPalette } from "@/app/(domain)/app/types";
import { ARTICLE_RELEVANCE_ORDER, BLACKLISTED_KEYWORDS, MINIMUM_WORD_COUNT, WHITELISTED_KEYWORDS, DEFAULT_ARTICLE_BG, ARTICLE_BG_DARKEN, DEFAULT_ARTICLE_FG, ARTICLE_FG_LIGHTEN, ARTICLE_BG_GRADIENT_OFFSET, ARTICLE_FG_GRADIENT_OFFSET, ARTICLE_BG_OPACITY, ARTICLE_FG_OPACITY, ARTICLE_RELEVANCE_TOKENS, DEFAULT_ARTICLE_RELEVANCE_TOKEN } from "../config";
import { Track } from "@spotify/web-api-ts-sdk";
import { createGradientStyleString, darkenRGB, lightenRGB, rgbaToStyleString } from "../../utilities/colors";

export function filterArticlesForRelevance(articles?: (ArticleSearchResult | CompleteArticle)[], track?: Track): (ArticleSearchResult | CompleteArticle)[] {
    if (!articles || !track) return [];
    const filteredArticles: (ArticleSearchResult | CompleteArticle)[] = [];

    articles.forEach((article) => {
        const artistNames = track.artists.map((artist) => artist.name.toLowerCase()).flatMap((name) => name.split(' '));
        if (article && article.link) {
            const title = article.title.toLowerCase();
            let relevance = '';

            if (BLACKLISTED_KEYWORDS.some((keyword) => title.includes(keyword)))
                return;

            if ('wordCount' in article && article.wordCount < MINIMUM_WORD_COUNT)
                return;

            if (filteredArticles.some((filteredArticle) => filteredArticle?.title === article.title) || filteredArticles.some((filteredArticle) => filteredArticle?.link === article.link))
                return;

            if (title.includes(track.name.toLowerCase()))
                relevance = 'track';
            else if (title.includes(track.album.name.toLowerCase()))
                relevance = 'album';
            else if (artistNames.some((name) => title.includes(name)))
                relevance = 'artist';

            if (relevance.length > 0)
                filteredArticles.push({ ...article, relevance, type: assignType(article) });
        }
    });

    return sortArticles(filteredArticles);
}

function sortArticles(articles: (ArticleSearchResult | CompleteArticle)[]): (ArticleSearchResult | CompleteArticle)[] {
    return articles.sort((a, b) => {
        let aScore = ARTICLE_RELEVANCE_ORDER.indexOf(a?.relevance ?? 'artist');
        let bScore = ARTICLE_RELEVANCE_ORDER.indexOf(b?.relevance ?? 'artist');

        const aTitle = a?.title.toLowerCase();
        const bTitle = b?.title.toLowerCase();

        if (a?.type === 'wikipedia' || a?.type === 'genius')
            aScore += 100;
        if (b?.type === 'wikipedia' || b?.type === 'genius')
            bScore += 100;

        if (aScore === bScore) {
            if (WHITELISTED_KEYWORDS.some((keyword) => aTitle?.includes(keyword)))
                aScore -= 0.1;
            if (WHITELISTED_KEYWORDS.some((keyword) => bTitle?.includes(keyword)))
                bScore -= 0.1;

            if (a && b && 'wordCount' in a && 'wordCount' in b) {
                if (a.wordCount > b.wordCount)
                    aScore -= 0.1;
                else if (a.wordCount < b.wordCount)
                    bScore -= 0.1;
            }
        }
        return aScore - bScore;
    });
}

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
    return siteName && siteName.length > 1 ? siteName : (link.split('/')[2].replace('www.', '').split('.')[0].toLocaleUpperCase());
}

export function getRelevanceToken(relevance: string): string {
    return ARTICLE_RELEVANCE_TOKENS[relevance] ?? DEFAULT_ARTICLE_RELEVANCE_TOKEN;
}

export function getArticleNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
}

export function getTimeToRead(wordCount?: number): string {
    if (!wordCount) return '';
    return (Math.floor(wordCount / 238)) + ':' + (Math.floor((wordCount % 238) / (238 / 60)).toString().padStart(2, '0'));
}

export function getArticleTextGradient(article: CompleteArticle, trackPalette: TrackPalette | undefined, index: number): string {
    if (article.gradient) return article.gradient;
    return getDefaultArticleForeground(index, trackPalette);
}

export function getArticleBackgroundGradient(trackPalette: TrackPalette | undefined, index: number): string {
    return getDefaultArticleBackground(index, trackPalette);
}

export function getDefaultArticleBackground(index: number, trackPalette?: TrackPalette) {
    if (!trackPalette) return DEFAULT_ARTICLE_BG;

    const options = Object.values(trackPalette).filter((swatch) => swatch !== undefined && swatch.rgb);
    if (options.length === 0) return DEFAULT_ARTICLE_BG;

    const swatch = options[index % options.length];
    if (!swatch || !swatch.rgb) return DEFAULT_ARTICLE_BG;

    const rgb = [...swatch.rgb];
    const darkened = darkenRGB(rgb, ARTICLE_BG_DARKEN);
    const darkened2 = darkenRGB(rgb, ARTICLE_BG_GRADIENT_OFFSET);
    const angle = index * 200 % 360;

    return createGradientStyleString(rgbaToStyleString([...darkened, ARTICLE_BG_OPACITY]), rgbaToStyleString([...darkened2, ARTICLE_BG_OPACITY]), angle, 0, 200);
}

export function getDefaultArticleForeground(index: number, trackPalette?: TrackPalette) {
    if (!trackPalette) return DEFAULT_ARTICLE_FG;

    const options = Object.values(trackPalette).filter((swatch) => swatch !== undefined && swatch.rgb);
    if (options.length === 0) return DEFAULT_ARTICLE_FG;

    const swatch = options[index % options.length];
    if (!swatch || !swatch.rgb) return DEFAULT_ARTICLE_FG;

    const rgb = [...swatch.rgb];
    const lightened = lightenRGB(rgb, ARTICLE_FG_LIGHTEN);
    const lightened2 = lightenRGB(rgb, ARTICLE_FG_GRADIENT_OFFSET);
    const angle = index * 200 % 360 + 180;

    return createGradientStyleString(rgbaToStyleString([...lightened, ARTICLE_FG_OPACITY]), rgbaToStyleString([...lightened2, ARTICLE_FG_OPACITY]), angle, 0, 100);
}
