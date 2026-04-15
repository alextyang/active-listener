import { CLUE_TYPE_ALBUM, CLUE_TYPE_ARTICLE, CLUE_TYPE_ARTIST, CLUE_TYPE_TRACK, DEBUG_SUMMARY_PARSE as LOG_P, SUMMARY_DEFAULT_COLOR, SUMMARY_OVERLAY_OPACITY } from "../config";
import { ContextClueObject, TrackContextObject } from "../context";
import { CompleteArticle } from "../types";
import { Album, Artist, Track } from "@spotify/web-api-ts-sdk";
import { isAlphaNumeric } from "../../utilities/text";
import { rgbaToStyleString } from "../../utilities/colors";
import { InlineAlbumTooltip, InlineArticleTooltip, InlineArtistTooltip, InlineTrackTooltip } from "@/app/(components)/app/summary/inlineTooltip";

export function parseSummary(str: string, originalClues: ContextClueObject): React.ReactNode[] {
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
        }
        else if (str[index] === '\n') {
            if (workingTextNode.length > 0)
                textNodes.push(createTextNode(workingTextNode, index));
            workingTextNode = '';

            if (textNodes.length > 0)
                summary.push(wrapParagraphNodes(index, textNodes));
            textNodes = [];
            index++;
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
    if (clue.type === CLUE_TYPE_ARTIST)
        return (<InlineArtistTooltip key={index + 'clue'} artist={clue.value as Artist}>
            <span>{name}</span>
        </InlineArtistTooltip>);
    if (clue.type === CLUE_TYPE_ALBUM)
        return (<InlineAlbumTooltip key={index + 'clue'} album={clue.value as Album}>
            <span>{name}</span>
        </InlineAlbumTooltip>);
    if (clue.type === CLUE_TYPE_ARTICLE)
        return (<InlineArticleTooltip key={index + 'clue'} article={clue.value as CompleteArticle}>
            <span>{name}</span>
        </InlineArticleTooltip>);
    return <span key={index + 'clue'}>{name}</span>;
}

export function getSummaryOverlayColor(trackContext: TrackContextObject): string {
    if (!trackContext?.palette) return SUMMARY_DEFAULT_COLOR;

    const rgb = trackContext.palette.Muted?.rgb;
    if (!rgb) return SUMMARY_DEFAULT_COLOR;

    return rgbaToStyleString([...rgb, SUMMARY_OVERLAY_OPACITY]);
}
