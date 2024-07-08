import { Article } from "@/app/types";
import { Track } from "@spotify/web-api-ts-sdk";



export function filterArticles(articles: Article[], track: Track): Article[] {
    const uniqueArticles = Array.from(new Set(articles));
    const filteredArticles: Article[] = [];
    uniqueArticles.forEach((article, index) => {
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
    return sortArticles(filteredArticles);
}

const articleRelevanceOrder = ['track', 'album', 'artist'];
function sortArticles(articles: Article[]): Article[] {
    return articles.sort((a, b) => {
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

            if (a?.wordCount && b?.wordCount) {
                if (a?.wordCount > b?.wordCount)
                    aScore -= 0.1;
                else if (a?.wordCount < b?.wordCount)
                    bScore -= 0.1;
            }

        }

        return aScore - bScore;
    });
}