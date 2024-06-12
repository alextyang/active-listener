'use server';

import { Album, Artist, PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { Article } from "../../../types";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export async function getArticles(track: Track | undefined): Promise<(Article)[]> {
    if (!track)
        return [];

    console.log('[ARTICLES] Searching for articles for ' + track?.name + ' ' + track?.artists.map((artist) => artist.name).join(' '));

    const potentialArticlePromise = await searchArticles(track?.name + ' ' + track?.artists.map((artist) => artist.name).join(' '));

    if (!potentialArticlePromise)
        return [];

    const articles: Article[] = [];
    potentialArticlePromise.forEach((article) => {
        const [artistName, artistSurname] = track.artists[0].name.split(' ');
        if (article &&
            (
                (
                    (article.title.includes(artistName)
                        || (artistSurname && artistSurname.trim().length > 1 && article.title.includes(artistSurname)))
                )
                || article.title.includes(track.album.name)
                || article.title.includes(track.name)
                || article.link.includes('wikipedia')
            )
            && article.link) {
            articles.push({ link: article.link, title: article.title });
        }
    });

    console.log('[ARTICLES] Found ' + potentialArticlePromise.length + ', kept ' + articles.length);

    return Promise.all(articles.map(fetchArticle));
}

async function searchArticles(query: string): Promise<Article[]> {
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID)
        return [];

    const params = new URLSearchParams({
        q: query,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        key: process.env.GOOGLE_API_KEY
    });
    const res = await fetch('https://customsearch.googleapis.com/customsearch/v1?' + params, { cache: 'force-cache' });

    const json = await res.json();

    return json.items;
}

async function fetchArticle(protoArticle: Article): Promise<Article> {
    if (!protoArticle)
        return undefined;

    let res, html;

    if (protoArticle.link.includes('wikipedia')) {
        const pageName = protoArticle.link.split('/').pop();
        if (!pageName)
            return undefined;

        const params = new URLSearchParams({
            action: 'query',
            prop: 'extracts',
            titles: pageName,
            explaintext: 'true',
            format: 'json'
        });
        res = await fetch('https://en.wikipedia.org/w/api.php?' + params, { next: { revalidate: 3600000 } });
        html = await res.json();
        html = html.query.pages[Object.keys(html.query.pages)[0]].extract;

    }
    else {
        res = await fetch(protoArticle.link, { next: { revalidate: 3600000 } });
        html = await res.text();
    }


    const tempWindow = new JSDOM('html').window;
    const purify = DOMPurify(tempWindow);

    const sanitizedHtml = purify.sanitize(html);
    const window = new JSDOM(sanitizedHtml).window;

    const doc = window.document;
    const reader = new Readability(doc, { debug: false });
    const article = reader.parse();

    if (article === null)
        return undefined;

    if (protoArticle.link.includes('wikipedia')) {
        article.textContent = article.textContent.split('References[edit]')[0];
        article.content = article.content.split('<span id="References">References</span>')[0];
        console.log('[ARTICLES] Wikipedia article found:', article.title);
    }

    return { link: protoArticle.link, title: article.title, content: article.textContent, siteName: article.siteName, publishedTime: article.publishedTime, byline: article.byline };
}