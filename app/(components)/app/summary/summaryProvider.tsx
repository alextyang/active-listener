import { ArticleContext, ContextClueContext, SummaryContext, TrackContext, TrackSyncContext } from "@/app/(domain)/app/context";
import { streamSummary } from "@/app/(domain)/app/summary/summary";
import Vibrant from "node-vibrant";
import { Vec3 } from "node-vibrant/lib/color";
import Image from "next/image";
import { useCallback, useContext, useEffect, useRef, useState } from "react";


export function SummaryProvider({ children }: { children: React.ReactNode }) {
    const trackContext = useContext(TrackContext);
    const fetchState = useContext(TrackSyncContext);
    const clues = useContext(ContextClueContext);
    const articles = useContext(ArticleContext).articles;

    const [summary, setSummary] = useState<React.ReactNode[]>([]);

    const currentTrackID = useRef<string>('');

    const handleUpdateSummary = useCallback((value: React.ReactNode[], id: string) => {
        if (id !== currentTrackID.current) return;
        setSummary(value);
    }, []);

    const handleTryStreamSummary = useCallback(async () => {
        if (!trackContext?.track) return setSummary([]);
        if (trackContext?.track?.id === currentTrackID.current) return;
        if (!(fetchState.state.state === 'articles' && fetchState.state.percent === 100)) return setSummary([]);
        currentTrackID.current = trackContext.track.id;

        await streamSummary(trackContext.track, articles, clues, handleUpdateSummary, () => currentTrackID.current, fetchState.state, fetchState.update);
    }, [trackContext?.track, fetchState.state, fetchState.update, articles, clues, handleUpdateSummary]);

    useEffect(() => {
        handleTryStreamSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackContext?.track, articles]);

    return (
        <SummaryContext.Provider value={{ summary }}>
            {children}
        </SummaryContext.Provider>
    )
}