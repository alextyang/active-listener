import { readStreamableValue, StreamableValue } from "ai/rsc";
import { fetchInternalResource } from "../../utilities/fetch";
import { simplifyArticles } from "../articles/articles";
import { CLUE_TYPE_ALBUM, CLUE_TYPE_ARTICLE, CLUE_TYPE_ARTIST, CLUE_TYPE_TRACK, DEBUG_CLUES, DEBUG_SUMMARY_PARSE as LOG_P, DEBUG_SUMMARY_STREAM as LOG_S, SUMMARY_API_ROUTE } from "../config";
import { ContextClueObject, TrackContextObject, TrackSyncState } from "../context";
import { CompleteArticle } from "../types";
import { Album, Artist, Track } from "@spotify/web-api-ts-sdk";
import { AlbumHoverMenu, ArticleHoverMenu, ArtistHoverMenu, TrackHoverMenu } from "@/app/(components)/music/textualHoverMenu";
import { startSummaryStream } from "@/app/(api)/summarize/action";

export async function streamSummary(track: Track, articles: CompleteArticle[] | undefined, clues: ContextClueObject, updateSummary: (value: React.ReactNode[], id: string) => void, getCurrentTrackID: () => string, updateSyncState?: (state: TrackSyncState) => void): Promise<void> {
    if (!track) return updateSummary([], '');
    if (!articles || articles.length === 0) {
        if (LOG_S) console.log('[SUMMARY-STREAM] Giving no material summary for ' + track.name);
        return updateSummary(parseSummary('No reviews found for ' + track.name + ' by ' + track.artists.map(artist => artist.name).join(', ') + ' from ' + track.album.name + '.', clues), track.id);
    }
    if (LOG_S) console.log('[SUMMARY-STREAM] Streaming summary for ' + track.name + ' by ' + track.artists.map(artist => artist.name).join(', ') + ' from ' + track.album.name + ' with ' + articles.length + ' articles');

    if (updateSyncState) updateSyncState({ state: 'summary', percent: -1 });

    const action = startSummaryStream.bind(null, { track, articles: simplifyArticles(articles) });
    const summaryStream = await action();

    if (!summaryStream) return updateSummary([], track.id);

    let summaryString = '';
    for await (const value of readStreamableValue(summaryStream)) {
        summaryString += value;
        if (track.id !== getCurrentTrackID()) return;
        updateSummary(parseSummary(summaryString, clues), track.id);

        if (LOG_P) console.log('[SUMMARY-STREAM] Updated summary for ' + track.name + ' with ' + summaryString.length + ' characters');
    }

    if (updateSyncState) updateSyncState({ state: 'idle', percent: -1 });
}

function parseSummary(str: string, originalClues: ContextClueObject): React.ReactNode[] {
    if (!str || str.length === 0) return [];
    str = ' ' + cleanSummary(str);

    let index = 0;
    const clues = { ...originalClues };
    const summary = [];
    let textNodes = [];
    let workingTextNode = '';

    while (index < str.length) {
        const clue = getClue(str, index, clues);
        if (clue) {
            if (workingTextNode.length > 0)
                textNodes.push(createTextNode(workingTextNode, index));
            workingTextNode = '';

            textNodes.push(createClueNode(clue, originalClues[clue], index));
            index += clue.length + 1;

            if (DEBUG_CLUES) console.log('[SUMMARY-PARSE] Found ' + originalClues[clue].type + ' clue:', clue, 'at', index);
        }
        else if (str[index] === '\n') {
            if (workingTextNode.length > 0)
                textNodes.push(createTextNode(workingTextNode, index));
            workingTextNode = '';

            if (textNodes.length > 0)
                summary.push(wrapParagraphNodes(index, textNodes));
            textNodes = [];

            index++;

            if (LOG_P) console.log('[SUMMARY-PARSE] Finished paragraph', summary);
        }
        else {
            workingTextNode += str[index];
            index++;
        }
    }
    if (workingTextNode.length > 0)
        textNodes.push(createTextNode(workingTextNode, index));
    if (textNodes.length > 0)
        summary.push(wrapParagraphNodes(index, textNodes));

    if (LOG_P) console.log('[SUMMARY-PARSE] Finished summary', summary);


    return summary;
}

function cleanSummary(str: string): string {
    return str.replaceAll('"', '').replaceAll('\' ', ' ').replaceAll(' \'', ' ').replaceAll('**', '').trim();
}

function getClue(str: string, from: number, clues: ContextClueObject): string | undefined {
    if (str[from] !== ' ') return undefined;

    const clue = Object.keys(clues).find(key => str.slice(from + 1, from + key.length + 1).toLowerCase().startsWith(key.toLowerCase()));

    if (clue && clues[clue])
        delete clues[clue];

    return clue;
}

function createTextNode(str: string, index: number) {
    return (<p key={index + 'plain'}> {str + ' '}</p>);
}

function wrapParagraphNodes(index: number, children: React.ReactNode[]) {
    return (<div className="summaryBlock" key={index + 'summaryBlock'}>{children}</div>);
}

function createClueNode(name: string, clue: { type: string, value: any }, index: number) {
    if (clue.type === CLUE_TYPE_TRACK)
        return (<TrackHoverMenu key={index + 'clue'} track={clue.value as Track}>
            <p>{name}</p>
        </TrackHoverMenu>);
    else if (clue.type === CLUE_TYPE_ARTIST)
        return (<ArtistHoverMenu key={index + 'clue'} artist={clue.value as Artist}>
            <p>{name}</p>
        </ArtistHoverMenu>);
    else if (clue.type === CLUE_TYPE_ALBUM)
        return (<AlbumHoverMenu key={index + 'clue'} album={clue.value as Album}>
            <p>{name}</p>
        </AlbumHoverMenu>);
    else if (clue.type === CLUE_TYPE_ARTICLE)
        return (<ArticleHoverMenu key={index + 'clue'} article={clue.value as CompleteArticle}>
            <p>{name}</p>
        </ArticleHoverMenu>);
    else
        console.error('Unknown clue type parsed:', clue);

}