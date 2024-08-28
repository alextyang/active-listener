import { readStreamableValue, StreamableValue } from "ai/rsc";
import { fetchInternalResource } from "../../utilities/fetch";
import { simplifyArticles } from "../articles/articles";
import { CACHE_SUMMARY_KEY, CLUE_TYPE_ALBUM, CLUE_TYPE_ARTICLE, CLUE_TYPE_ARTIST, CLUE_TYPE_TRACK, DEBUG_CLUES, DEBUG_SUMMARY_PARSE as LOG_P, DEBUG_SUMMARY_STREAM as LOG_S, SUMMARY_API_ROUTE, SUMMARY_DEFAULT_COLOR, SUMMARY_OVERLAY_OPACITY } from "../config";
import { ContextClueObject, TrackContextObject, TrackSyncState } from "../context";
import { CompleteArticle } from "../types";
import { Album, Artist, Track } from "@spotify/web-api-ts-sdk";
import { startSummaryStream } from "@/app/(api)/summarize/action";
import { extractCommonName } from "../../music/metadata";
import { loadTrackProperty, savePropertyToTrack } from "../../site/cache";
import { isAlphaNumeric } from "../../utilities/text";
import { rgbaToStyleString } from "../../utilities/colors";
import { InlineAlbumTooltip, InlineArticleTooltip, InlineArtistTooltip, InlineTrackTooltip } from "@/app/(components)/app/summary/inlineTooltip";

// FETCHING
export async function streamSummary(track: Track, articles: CompleteArticle[] | undefined, clues: ContextClueObject, updateSummary: (value: React.ReactNode[], id: string) => void, getCurrentTrackID: () => string, syncState: TrackSyncState, updateSyncState?: (state: TrackSyncState) => void): Promise<void> {
    if (!track) return updateSummary([], '');

    const cachedSummary = await loadTrackProperty<string>(track.id, CACHE_SUMMARY_KEY);
    if (cachedSummary) {
        if (LOG_S) console.log('[SUMMARY-STREAM] Found cached summary for ' + track.name);
        if (updateSyncState) updateSyncState({ state: 'waiting', percent: -1 });
        return updateSummary(parseSummary(cachedSummary, clues, track), track.id);
    }

    if (!articles || (articles.length === 0)) {
        if ((syncState.state === 'articles' && syncState.percent === 100)) {
            if (updateSyncState) updateSyncState({ state: 'waiting', percent: -1 });
            if (LOG_S) console.log('[SUMMARY-STREAM] Giving no material summary for ' + track.name);

            const noMaterialSummary = 'No reviews found for ' + track.name + ' by ' + track.artists.map(artist => artist.name).join(', ') + ' from ' + track.album.name + '.';
            savePropertyToTrack<string>(track.id, CACHE_SUMMARY_KEY, noMaterialSummary);
            return updateSummary(parseSummary(noMaterialSummary, clues, track), track.id);
        }
        if (LOG_S) console.log('[SUMMARY-STREAM] Waiting for articles for ' + track.name);
        return;
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
        updateSummary(parseSummary(summaryString, clues, track), track.id);

        if (LOG_P) console.log('[SUMMARY-STREAM] Updated summary for ' + track.name + ' with ' + summaryString.length + ' characters');
    }

    savePropertyToTrack<string>(track.id, CACHE_SUMMARY_KEY, summaryString);

    if (updateSyncState) updateSyncState({ state: 'waiting', percent: -1 });

    return;
}

function parseSummary(str: string, originalClues: ContextClueObject, track: Track): React.ReactNode[] {
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

            if (LOG_P) console.log('[SUMMARY-PARSE] Found ' + originalClues[clue].type + ' clue:', clue, 'at', index);
            if (LOG_P) console.log('[SUMMARY-PARSE] Working text:', textNodes);
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

    const clue = Object.keys(clues).find(key =>
        str.slice(from + 1, from + key.length + 1).toLowerCase().startsWith(key.toLowerCase())
        && (from + key.length + 1 >= str.length || !isAlphaNumeric(str[from + key.length + 1])));

    if (clue && clues[clue])
        delete clues[clue];

    return clue;
}

function createTextNode(str: string, index: number) {
    return (<span key={index + 'plain'}>{str + ' '}</span>);
}

function wrapParagraphNodes(index: number, children: React.ReactNode[]) {
    return (<div className="summaryBlock" key={index + 'summaryBlock'}>{children}</div>);
}

function createClueNode(name: string, clue: { type: string, value: any }, index: number) {
    if (clue.type === CLUE_TYPE_TRACK)
        return (<InlineTrackTooltip key={index + 'clue'} track={clue.value as Track}>
            <span>{name}</span>
        </InlineTrackTooltip>);
    else if (clue.type === CLUE_TYPE_ARTIST)
        return (<InlineArtistTooltip key={index + 'clue'} artist={clue.value as Artist}>
            <span>{name}</span>
        </InlineArtistTooltip>);
    else if (clue.type === CLUE_TYPE_ALBUM)
        return (<InlineAlbumTooltip key={index + 'clue'} album={clue.value as Album}>
            <span>{name}</span>
        </InlineAlbumTooltip>);
    else if (clue.type === CLUE_TYPE_ARTICLE)
        return (<InlineArticleTooltip key={index + 'clue'} article={clue.value as CompleteArticle}>
            <span>{name}</span>
        </InlineArticleTooltip>);
    else
        console.error('Unknown clue type parsed:', clue);

}


// RENDERING
export function getSummaryOverlayColor(trackContext: TrackContextObject): string {
    if (!trackContext || !trackContext.palette) return SUMMARY_DEFAULT_COLOR;

    const rgb = trackContext.palette.Muted?.rgb.flat();
    if (!rgb) return SUMMARY_DEFAULT_COLOR;

    return rgbaToStyleString([...rgb, SUMMARY_OVERLAY_OPACITY]);
}

