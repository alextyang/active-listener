"use server";

import { assignType, filterArticlesForRelevance, trimByline, trimSiteName, trimTitle, trimWikipediaText } from "@/app/(domain)/app/articles/articles";
import { DEBUG_ARTICLE_POPULATE as LOG, ARTIST_SEARCH_QUERY, WIKIPEDIA_POPULATE_URL, DEFAULT_ARTICLE_RELEVANCE, DEFAULT_ARTICLE_TYPE } from "@/app/(domain)/app/config";
import { isTrackSingle } from "@/app/(domain)/music/metadata";
import { ArticleSearchResult, CompleteArticle, ReadabilityResult } from "@/app/(domain)/app/types";
import { fetchResource, parseParameter, fetchText } from "@/app/(domain)/utilities/fetch";
import { findOpenGraphImage, htmlToDocument } from "@/app/(domain)/utilities/document";
import { parseReadableArticle } from "@/app/(domain)/utilities/readability";
import { extractArticleGradient } from "@/app/(domain)/utilities/colors";


export async function POST(request: Request) {
    const initialArticles = await parseParameter<ArticleSearchResult[]>(request);
    if (!initialArticles) return Response.error();
    const time = Date.now();
    // if (LOG) console.log('[ARTICLE-POPULATE] Populating articles: ' + initialArticles.map((article) => '\n\t' + article?.title));

    const results = await Promise.all(initialArticles.map(async (article) => await populateArticle(article)));
    if (LOG) console.log('[ARTICLE-POPULATE] Populated articles in ' + (Date.now() - time) + 'ms' + results.map(result => '\n\t' + result?.title + ' - ' + result?.wordCount));

    return Response.json({ response: results });
}

async function populateArticle(article: ArticleSearchResult): Promise<CompleteArticle | undefined> {
    if (article && (!article.type || !article.relevance)) article = filterArticlesForRelevance([article])[0];
    if (!article) return undefined;

    const html = await fetchArticle(article);
    if (!html) return undefined;

    const doc = htmlToDocument(html);
    if (!doc) return undefined;

    let readability = parseReadableArticle(doc);
    if (article.type === 'wikipedia') readability = trimWikipediaText(readability);
    if (!readability) return undefined;

    const content = readability.textContent.trim();
    const siteName = trimSiteName(article.link, readability.siteName);
    const image = findOpenGraphImage(html);
    const gradient = await extractArticleGradient(image);
    const byline = trimByline(readability.byline);
    const wordCount = readability.textContent.split(' ').length;
    const title = trimTitle(article.title, readability.title, siteName);

    const type = article.type ?? DEFAULT_ARTICLE_TYPE;
    const relevance = article.relevance ?? DEFAULT_ARTICLE_RELEVANCE;

    return {
        ...article,
        ...readability,
        title,
        content,
        siteName,
        image,
        gradient,
        byline,
        wordCount,
        relevance,
        type
    }
}


async function fetchArticle(article: ArticleSearchResult): Promise<string | undefined> {
    if (!article) return undefined;
    if (article.type === 'wikipedia') return fetchWikipediaArticle(article);
    const html = await fetchText(article.link, {});
    // if (LOG) console.log('[ARTICLE-POPULATE] HTML found for ' + article.title);
    return html;
}

async function fetchWikipediaArticle(article: ArticleSearchResult): Promise<string | undefined> {
    if (!article || article.type !== 'wikipedia') return undefined;
    const pageName = article.link.split('/').pop();
    const results = await fetchResource<any>(WIKIPEDIA_POPULATE_URL, {
        action: 'query',
        prop: 'extracts',
        titles: pageName,
        explaintext: 'true',
        format: 'json'
    });
    const html = results?.query.pages[Object.keys(results.query.pages)[0]].extract;
    // if (LOG) console.log('[ARTICLE-POPULATE] Wikipedia HTML found for ' + article.title);
    return html;
}

