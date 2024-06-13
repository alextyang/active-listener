import { useContext, useEffect, useRef, useState } from "react";
import { TrackContext } from "../../../../context";

import { Article } from "../../../../types";
import { StreamableValue, readStreamableValue } from 'ai/rsc';
import { createSummary } from "./actions";
import { PhotoCard } from "../../components/photoCard";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;


export function Summary({ articles }: { articles: Article[] }) {
    const currentTrackInfo = useContext(TrackContext);
    const [summary, setSummary] = useState<string>('');

    const isStreaming = useRef<boolean>(false);
    const lastTrackID = useRef<string | undefined>('');

    useEffect(() => {
        if (isStreaming.current || articles.length == 0) return;
        isStreaming.current = true;

        const getSummary = createSummary.bind(null, articles, currentTrackInfo?.track);

        console.log('[SUMMARY] Requesting summary for articles:', articles.map((article) => article?.title).join(', '), currentTrackInfo?.track);

        const readStream = async (stream: StreamableValue<string, any>) => {
            for await (const delta of readStreamableValue(stream)) {
                setSummary(summary => `${summary}${delta}`);
            }
            isStreaming.current = false;
        };

        getSummary().then(readStream);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articles]);

    useEffect(() => {
        if (currentTrackInfo?.track.id === lastTrackID.current) return;

        lastTrackID.current = currentTrackInfo?.track.id;
        isStreaming.current = false;

        setSummary('');
    }, [currentTrackInfo]);

    return (
        <PhotoCard src={currentTrackInfo?.track.album.images[0].url}>
            <div className="summary">
                <div className="summaryIcon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#FFFFFF" stroke-width="2"><path d="M8 15C12.8747 15 15 12.949 15 8C15 12.949 17.1104 15 22 15C17.1104 15 15 17.1104 15 22C15 17.1104 12.8747 15 8 15Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"></path><path d="M2 6.5C5.13376 6.5 6.5 5.18153 6.5 2C6.5 5.18153 7.85669 6.5 11 6.5C7.85669 6.5 6.5 7.85669 6.5 11C6.5 7.85669 5.13376 6.5 2 6.5Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"></path></svg>
                </div>
                {summary.split('\n\n').map((line, index) => <p key={index}>{line}</p>)}
            </div>
        </PhotoCard>
    )
}