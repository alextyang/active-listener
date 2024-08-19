"use client";

import { ArticleContext, ContextClueContext, ContextClueObject, TrackContext, TrackSyncContext, TrackSyncState } from "@/app/(domain)/app/context";
import { getArticles } from "@/app/(domain)/app/articles/articles";
import { CompleteArticle } from "@/app/(domain)/app/types";
import { useContext, useState, useRef, useCallback, useEffect } from "react";
import { DEBUG_ARTICLE_POPULATE } from "@/app/(domain)/app/config";
import { extractArticleContextClues } from "../../../(domain)/app/articles/clues";

export function ArticleProvider({ children }: { children: React.ReactNode }) {
    const trackContext = useContext(TrackContext);
    const fetchState = useContext(TrackSyncContext);

    const [articles, setArticles] = useState<CompleteArticle[]>([]);
    const lastTrackID = useRef<string | undefined>('');

    const contextClues = useContext(ContextClueContext);
    const [articleContextClues, setArticleContextClues] = useState<ContextClueObject>({});

    const handleSyncStateUpdate = useCallback((state: TrackSyncState) => {
        if (DEBUG_ARTICLE_POPULATE) console.log('[ARTICLE-POPULATE] Sync state update:', state);
        fetchState.update(state);
    }, [fetchState]);

    const handleArticleUpdate = useCallback(async () => {
        if (trackContext?.track?.id === lastTrackID.current) return;
        setArticles([]);

        if (!trackContext?.track) return;
        lastTrackID.current = trackContext.track.id;

        const newArticles = await getArticles(trackContext.track, handleSyncStateUpdate);

        if (trackContext?.track && trackContext.track.id === lastTrackID.current)
            setArticles(newArticles);

        setArticleContextClues(extractArticleContextClues(newArticles));
    }, [handleSyncStateUpdate, trackContext?.track]);

    useEffect(() => {
        handleArticleUpdate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackContext?.track]);

    return (
        <ArticleContext.Provider value={{ articles }}>
            <ContextClueContext.Provider value={{ ...articleContextClues, ...contextClues }}>
                {children}
            </ContextClueContext.Provider>
        </ArticleContext.Provider>
    )
}