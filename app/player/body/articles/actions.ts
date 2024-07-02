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
    const potentialAlbumArticles = await searchArticles(track?.album.name + ' ' + track?.artists.map((artist) => artist.name).join(' '));
    const potentialArtistArticles = await searchArticles(track?.artists.map((artist) => artist.name).join(' ') + ' interview -wikipedia');

    const articles = filterArticles(potentialArticlePromise.concat(potentialAlbumArticles).concat(potentialArtistArticles), track);

    if (articles.length === 0) {
        console.log('[ARTICLES] No articles found');
        return [];
    }

    console.log('[ARTICLES] Found ' + potentialArticlePromise.length + ', kept ' + articles.length);

    const fetchedArticles = await Promise.all(articles.map(fetchArticle));

    const refilteredArticles = filterArticles(fetchedArticles, track);

    const articleRelevanceOrder = ['track', 'album', 'artist'];

    refilteredArticles.sort((a, b) => {
        // Put less specific articles at the end
        let aScore = articleRelevanceOrder.indexOf(a?.relevance ?? 'artist');
        let bScore = articleRelevanceOrder.indexOf(b?.relevance ?? 'artist');

        // Put hidden articles at the end
        if (a?.type === 'wikipedia' || a?.type === 'genius')
            aScore += 100;
        if (b?.type === 'wikipedia' || b?.type === 'genius')
            bScore += 100;

        if (aScore === bScore) {
            // Put articles with the words 'review' or 'interview' at the start of each section
            if (a?.title.includes('Review') || a?.title.includes('Interview'))
                aScore -= 0.1;
            if (b?.title.includes('Review') || b?.title.includes('Interview'))
                bScore -= 0.1;
        }

        return aScore - bScore;
    });


    return refilteredArticles;
}

function filterArticles(articles: Article[], track: Track): Article[] {
    const filteredArticles: Article[] = [];
    articles.forEach((article, index) => {
        const artistNames = track.artists.map((artist) => artist.name.toLowerCase()).map((name) => name.split(' ')).flat();
        if (article && article.link) {
            const title = article.title.toLowerCase();
            let relevance = '';
            // Ignore video articles
            if (title.includes('watch') || title.includes('video') || title.includes('tour'))
                return;

            // Ignore duplicates
            if (filteredArticles.some((filteredArticle) => filteredArticle?.title === article.title))
                return;

            if (title.includes(track.name.toLowerCase()))
                relevance = 'track';
            else if (title.includes(track.album.name.toLowerCase()))
                relevance = 'album';
            else if (artistNames.some((name) => title.includes(name)))
                relevance = 'artist';

            if (relevance.length > 0)
                return filteredArticles.push({ ...article, relevance });

            console.log('[ARTICLES] Ignoring ' + article.title);
        }
    });
    return filteredArticles;
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
        let palette;
        try {
            const ogImageTag = html.split('og:image')[1].split('content="')[1].split('"')[0];
            if (ogImageTag && new URL(ogImageTag))
                ogImage = ogImageTag;

            palette = await Vibrant.from(ogImage).getPalette();
        } catch (error) {
            // console.log('[ARTICLES] Error getting palette for ' + protoArticle.title);
        }

        extracts = [palette?.LightVibrant?.getHex() ?? '#FFF', palette?.LightMuted?.getHex() ?? '#CCC'];
    }

    if (protoArticle.link.includes('wikipedia')) {
        article.textContent = article.textContent.split('References[edit]')[0];
        article.content = article.content.split('<span id="References">References</span>')[0];
        articleType = 'wikipedia';
        article.siteName = 'Wikipedia';
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