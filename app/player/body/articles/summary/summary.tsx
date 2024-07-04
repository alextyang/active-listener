import { ReactElement, ReactNode, use, useContext, useEffect, useRef, useState } from "react";
import { TrackFetchContext, TrackContext } from "../../../../context";

import { Article } from "../../../../types";
import { StreamableValue, readStreamableValue } from 'ai/rsc';
import { createSummary } from "./actions";
import { PhotoCard } from "../../components/photoCard";
import { HoverMenu } from "@/app/components/hoverMenu";
import { AlbumHoverMenu, ArticleHoverMenu, ArtistHoverMenu, TrackHoverMenu } from "./components/TextualHoverMenu";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const SUMMARY_PARSE_INTERVAL = 100;


export function Summary({ articles }: { articles: Article[] }) {
    const trackContext = useContext(TrackContext);
    const fetchState = useContext(TrackFetchContext);

    const artistNames = useRef<string[] | undefined>([]);
    const siblingTrackNames = useRef<string[] | undefined>([]);
    const articleNames = useRef<string[] | undefined>([]);
    const albumNames = useRef<string[] | undefined>([]);

    const [summary, setSummary] = useState<string>('');
    const [summaryParsed, setSummaryParsed] = useState<React.ReactNode[]>([]);

    const isStreaming = useRef<boolean>(false);
    const isParsing = useRef<boolean>(false);
    const parseTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const parsedLength = useRef<number>(0);
    const lastTrackID = useRef<string | undefined>('');

    useEffect(() => {
        if (isStreaming.current) return;
        if (articles.length === 0) {
            if (fetchState.state.state === 'done' && trackContext?.track)
                return setSummary('No reviews found for ' + trackContext?.track?.name + ' by ' + trackContext?.track?.artists?.map(artist => artist.name).join(', ') + ' from ' + trackContext?.track?.album.name + '.');
            return setSummary('');
        }
        isStreaming.current = true;
        parsedLength.current = 0;
        isParsing.current = false;
        parseTimeout.current = undefined;

        setSummary('');
        fetchState.update({ state: 'summary', percent: -1 });
        const getSummary = createSummary.bind(null, articles, trackContext?.track);

        console.log('[SUMMARY] Requesting summary for articles:', articles.map((article) => article?.title).join(', '), trackContext?.track);

        const readStream = async (stream: StreamableValue<string, any>) => {
            setSummary('');

            for await (const delta of readStreamableValue(stream)) {
                setSummary(summary => `${summary}${delta}`);
            }
            if (trackContext?.track?.id !== lastTrackID.current) {
                setSummary('');
                setSummaryParsed([]);
            }
            isStreaming.current = false;
            fetchState.update({ state: 'done', percent: -1 });
        };

        getSummary().then(readStream);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articles]);

    useEffect(() => {
        if (trackContext?.track?.id === lastTrackID.current) return;

        lastTrackID.current = trackContext?.track?.id;
        isStreaming.current = false;

        setSummary('');
    }, [trackContext, trackContext?.track]);

    useEffect(() => {
        artistNames.current = trackContext?.artists?.map(artist => artist.name);

        siblingTrackNames.current = trackContext?.album?.tracks.items.map(track => track.name.split('(')[0]);

        albumNames.current = (trackContext?.siblingAlbums?.map(album => (album.name)) ?? []);
        if (!albumNames.current.includes(trackContext?.album?.name ?? ''))
            albumNames.current.push(trackContext?.album?.name ?? '');

        articleNames.current = articles.map(article => article?.siteName ?? '');

        console.log('[SUMMARY] Updated track context clues:', artistNames.current, siblingTrackNames.current, albumNames.current, articleNames.current);
    }, [trackContext, articles]);

    useEffect(() => {
        const parseSummary = () => {
            if (summary.length === 0 || !trackContext) return setSummaryParsed([]);

            parsedLength.current = summary.length;

            const checkClues = (clues: string[], text: string, startingFrom: number, ignoreChar?: string): { clueIndex: number, foundClue: string } => {
                if (!clues) return { clueIndex: -1, foundClue: '' };
                for (let i = 0; i < clues.length; i++) {
                    if (clues[i] && clues[i].length && clues[i].length > 1) {
                        const compareText = ignoreChar ?
                            text.substring(startingFrom, startingFrom + clues[i].length * 2).replaceAll(ignoreChar, '').substring(0, clues[i].length)
                            : text.substring(startingFrom, startingFrom + clues[i].length);

                        if (compareText.toLowerCase() === clues[i].toLowerCase()) {
                            return { clueIndex: i, foundClue: compareText };
                        }
                    }
                }
                return { clueIndex: -1, foundClue: '' };
            }

            const workingSummary = summary.replaceAll('"', '').replaceAll('\' ', ' ').replaceAll(' \'', ' ').replaceAll('**', '');
            let workingParsedSummary: React.ReactNode[] = [];
            const usedClues: string[] = [];
            const parseID = 0;
            // const parseID = Math.random().toString(36).substring(7);
            let nonClueString = '';

            const pushNonClueString = (str: string, key: string) => {
                if (str.length > 0) {
                    // console.log('[CLUE] Non-clue token:', str);
                    workingParsedSummary.push(<p key={key + 'plain'}>{str + ' '}</p>);
                }
            };

            for (let i = 0; i < workingSummary.length; i++) {
                if (i === workingSummary.length - 1) {
                    nonClueString += workingSummary[i];
                    pushNonClueString(nonClueString, i + 'summary' + parseID);
                }
                else if (i == 0 || workingSummary[i - 1] === ' ') {
                    let hasFoundClue = false;

                    if (artistNames.current && trackContext.artists) {
                        const foundArtistClue = checkClues(artistNames.current, workingSummary, i).clueIndex;

                        if (foundArtistClue !== -1 && !usedClues.includes(artistNames.current[foundArtistClue] + 'artist')) {
                            usedClues.push(artistNames.current[foundArtistClue] + 'artist');

                            pushNonClueString(nonClueString, i + 'summary' + parseID);

                            workingParsedSummary.push(
                                <ArtistHoverMenu key={i + 'summary' + parseID} artist={trackContext.artists[foundArtistClue]}>
                                    <p>{artistNames.current[foundArtistClue]}</p>
                                </ArtistHoverMenu>
                            );
                            hasFoundClue = true;
                            i += artistNames.current[foundArtistClue].length - 1;
                        }
                    }

                    if (!hasFoundClue && siblingTrackNames.current && trackContext.album) {
                        const foundTrackClue = checkClues(siblingTrackNames.current, workingSummary, i).clueIndex;

                        if (foundTrackClue !== -1 && !usedClues.includes(siblingTrackNames.current[foundTrackClue] + 'track')) {
                            usedClues.push(siblingTrackNames.current[foundTrackClue] + 'track');

                            pushNonClueString(nonClueString, i + 'summary' + parseID);

                            workingParsedSummary.push(
                                <TrackHoverMenu key={i + 'summary' + parseID} track={trackContext.album.tracks.items[foundTrackClue]}>
                                    <p>{siblingTrackNames.current[foundTrackClue]}</p>
                                </TrackHoverMenu>
                            );
                            hasFoundClue = true;
                            i += siblingTrackNames.current[foundTrackClue].length - 1;
                        }
                    }

                    if (!hasFoundClue && albumNames.current && trackContext.siblingAlbums && trackContext.album) {
                        const foundAlbumClue = checkClues(albumNames.current, workingSummary, i).clueIndex;

                        if (foundAlbumClue !== -1 && !usedClues.includes(albumNames.current[foundAlbumClue] + 'album')) {
                            usedClues.push(albumNames.current[foundAlbumClue] + 'album');
                            const album = trackContext.siblingAlbums[foundAlbumClue] ?? trackContext.album;

                            pushNonClueString(nonClueString, i + 'summary' + parseID);

                            workingParsedSummary.push(
                                <AlbumHoverMenu key={i + 'summary' + parseID} album={album}>
                                    <p>{albumNames.current[foundAlbumClue]}</p>
                                </AlbumHoverMenu>
                            );
                            hasFoundClue = true;
                            i += albumNames.current[foundAlbumClue].length - 1;
                        }
                    }

                    if (!hasFoundClue && articleNames.current && articles) {
                        const { clueIndex: foundArticleClue, foundClue: siteName } = checkClues(articleNames.current, workingSummary, i, ' ');

                        if (foundArticleClue !== -1 && !usedClues.includes(articleNames.current[foundArticleClue] + 'article')) {
                            usedClues.push(articleNames.current[foundArticleClue] + 'article');

                            pushNonClueString(nonClueString, i + 'summary' + parseID);

                            workingParsedSummary.push(
                                <ArticleHoverMenu key={i + 'summary' + parseID} article={articles[foundArticleClue]}>
                                    <p>{siteName}</p>
                                </ArticleHoverMenu>
                            );
                            hasFoundClue = true;
                            i += siteName.length - 1;
                        }
                    }

                    if (!hasFoundClue) {
                        nonClueString += workingSummary[i];
                    }
                    else
                        nonClueString = '';
                }
                else if (workingSummary[i] === '\n') {
                    if (workingSummary.length > 1 && workingSummary[i - 1] !== '\n') {
                        pushNonClueString(nonClueString, i + 'summary' + parseID);
                        nonClueString = '';
                        workingParsedSummary.push(<br key={i + 'break1' + parseID} />);
                        // workingParsedSummary.push(<br key={i + 'break2' + parseID} />);
                    }
                }
                else
                    nonClueString += workingSummary[i];
            }

            setSummaryParsed(unifyParagraphs(workingParsedSummary));

        }

        if (summary.length > 0) {
            parseSummary();
        }
        else
            setSummaryParsed([]);



    }, [summary, trackContext, artistNames, siblingTrackNames, albumNames, articles, isStreaming]);

    return (
        <PhotoCard src={trackContext?.track?.album.images[0].url}>
            <div className="summaryIcon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#FFFFFF" strokeWidth="2"><path d="M8 15C12.8747 15 15 12.949 15 8C15 12.949 17.1104 15 22 15C17.1104 15 15 17.1104 15 22C15 17.1104 12.8747 15 8 15Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"></path><path d="M2 6.5C5.13376 6.5 6.5 5.18153 6.5 2C6.5 5.18153 7.85669 6.5 11 6.5C7.85669 6.5 6.5 7.85669 6.5 11C6.5 7.85669 5.13376 6.5 2 6.5Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"></path></svg>
            </div>
            <div className="summary">

                {summaryParsed}
            </div>
        </PhotoCard>
    )
}

const unifyParagraphs = (nodes: ReactNode[]): ReactNode[] => {
    const newNodes: ReactNode[] = [];
    let workingParagraph: ReactNode[] = [];

    nodes.forEach((node, index) => {
        if (node as ReactElement && (node as ReactElement).type === 'br' && workingParagraph.length > 0) {
            newNodes.push(<div className="summaryBlock" key={index + 'summaryBlock'}>{workingParagraph}</div>);
            workingParagraph = [];
        }
        else {
            workingParagraph.push(node);
        }
    });

    if (workingParagraph.length > 0)
        newNodes.push(<div className="summaryBlock" key={nodes.length + 'summaryBlock'}>{workingParagraph}</div>);

    return newNodes;
};