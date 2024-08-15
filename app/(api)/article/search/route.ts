"use server";

import { filterArticlesForRelevance } from "@/app/(domain)/app/articles/articles";
import { ARTICLE_SEARCH_URL, ARTIST_SEARCH_QUERY, DEBUG_ARTICLE_SEARCH as LOG } from "@/app/(domain)/app/config";
import { ArticleSearchResult, CompleteArticle } from "@/app/(domain)/app/types";
import { isTrackSingle } from "@/app/(domain)/music/metadata";
import { fetchResource, parseParameter } from "@/app/(domain)/utilities/fetch";
import { Track } from "@spotify/web-api-ts-sdk";


export async function POST(request: Request) {
    const track = await parseParameter<Track>(request);
    if (!track) return Response.error();
    if (LOG) console.log('[ARTICLE-SEARCH] Searching for articles for ' + track.name + ' by ' + track.artists.map((artist) => artist.name).join(' '));

    const trackName = track.name;
    const artistNames = track.artists.map((artist) => artist.name).join(' ');
    const albumName = track.album.name;

    let results = (await Promise.all([
        searchArticles(trackName + ' ' + artistNames),
        (isTrackSingle(trackName, albumName)) ? searchArticles(albumName + ' ' + artistNames) : undefined,
        searchArticles(artistNames + ' ' + ARTIST_SEARCH_QUERY)
    ])).flat();

    results = filterArticlesForRelevance(results, track);

    if (LOG) console.log(`[ARTICLE-SEARCH] Found for ${track.name}: ${results.map(result => '\n\t' + result?.title)} `);
    return Response.json({ response: results });
}

async function searchArticles(query: string): Promise<(ArticleSearchResult)[] | undefined> {
    const results = await fetchResource<any>(ARTICLE_SEARCH_URL, {
        q: query,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        key: process.env.GOOGLE_API_KEY
    });
    return results?.items;
}