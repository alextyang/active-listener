'use server';

import { Album, Artist, PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { Article } from "../../../types";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import Vibrant from "node-vibrant";

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
        if (article && article.link) {
            if (article.title.includes(track.name))
                articles.push({ link: article.link, title: article.title, relevance: 'track' });
            else if (article.title.includes(track.album.name))
                articles.push({ link: article.link, title: article.title, relevance: 'album' });
            else if ((article.title.includes(artistName)
                || (artistSurname && artistSurname.trim().length > 1 && article.title.includes(artistSurname))))
                articles.push({ link: article.link, title: article.title, relevance: 'artist' });
        }
    });

    console.log('[ARTICLES] Found ' + potentialArticlePromise.length + ', kept ' + articles.length);

    const fetchedArticles = await Promise.all(articles.map(fetchArticle));

    const articleRelevanceOrder = ['track', 'album', 'artist'];
    const articleTypeOrder = ['article', 'wikipedia', 'genius'];

    fetchedArticles.sort((a, b) => {
        return articleRelevanceOrder.indexOf(a?.relevance ?? 'artist') - articleRelevanceOrder.indexOf(b?.relevance ?? 'artist');
    });

    fetchedArticles.sort((a, b) => {
        return articleTypeOrder.indexOf(a?.type ?? 'article') - articleTypeOrder.indexOf(b?.type ?? 'article');
    });

    return fetchedArticles;
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

    try {
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
            res = await fetch('https://en.wikipedia.org/w/api.php?' + params, { cache: 'force-cache' });
            html = await res.json();
            html = html.query.pages[Object.keys(html.query.pages)[0]].extract;
        }
        else {
            res = await fetch(protoArticle.link, { cache: 'force-cache' });
            html = await res.text();
        }

    } catch (error) {
        return undefined;
    }




    const tempWindow = new JSDOM('html').window;
    const purify = DOMPurify(tempWindow);

    const sanitizedHtml = purify.sanitize(html);
    const window = new JSDOM(sanitizedHtml).window;

    const doc = window.document;
    const reader = new Readability(doc, { debug: false });
    const article = reader.parse();

    let articleType = 'article', ogImage = '', extracts: string[] = [];

    if (article === null)
        return undefined;

    if (html.includes('og:image')) {
        const ogImageTag = html.split('og:image')[1].split('content="')[1].split('"')[0];
        if (ogImageTag)
            ogImage = ogImageTag;

        let palette;
        try {
            palette = await Vibrant.from(ogImage).getPalette();
        } catch (error) {
            console.log('[ARTICLES] Error getting palette for ' + protoArticle.title);
        }

        extracts = [palette?.LightVibrant?.getHex() ?? '#FFF', palette?.LightMuted?.getHex() ?? '#CCC'];

    }

    if (protoArticle.link.includes('wikipedia')) {
        article.textContent = article.textContent.split('References[edit]')[0];
        article.content = article.content.split('<span id="References">References</span>')[0];
        articleType = 'wikipedia';
    }

    if (protoArticle.link.includes('genius.com')) {
        articleType = 'genius';
    }

    return {
        link: protoArticle.link,

        title: article.title.length > 1 ? article.title : protoArticle.title,

        content: article.textContent.trim(),

        siteName: article.siteName && article.siteName.length > 1 ? article.siteName : (protoArticle.link.split('/')[2].replace('www.', '').split('.')[0].toLocaleUpperCase()),

        publishedTime: article.publishedTime,
        byline: article.byline?.replace(/[^\w\s]/gi, '').replace('By', '').replace('by', '').replace('Words', '').trim() ?? '',

        type: articleType,
        excerpt: article.excerpt,
        image: ogImage,
        colorExtracts: extracts,
        relevance: protoArticle.relevance
    };
}

function toTitleCase(str: string) {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}