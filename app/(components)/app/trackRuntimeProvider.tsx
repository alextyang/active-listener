"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArticleContext, ContextClueContext, PlaybackContext, SummaryContext, TrackContext, TrackSyncContext, TrackSyncState } from "@/app/(domain)/app/context";
import { CompleteArticle, TrackApiView, TrackMetadataRecord, TrackStageName } from "@/app/(domain)/app/types";
import { extractMetadataContextClues } from "@/app/(domain)/spotify/clues";
import { extractArticleContextClues } from "@/app/(domain)/app/articles/clues";
import { parseSummary } from "@/app/(domain)/app/summary/summary";
import { fetchTrackView, refreshTrackStage, streamTrackSummary } from "@/app/(domain)/tracks/client";
import { Track } from "@spotify/web-api-ts-sdk";

const STAGES: TrackStageName[] = ["metadata", "articles", "summary"];

export function TrackRuntimeProvider({ trackId, seedTrack, children }: { trackId?: string, seedTrack?: TrackMetadataRecord, children: React.ReactNode }) {
    const [trackContext, setTrackContext] = useState<TrackMetadataRecord>(seedTrack ?? {});
    const [articles, setArticles] = useState<CompleteArticle[]>([]);
    const [summaryText, setSummaryText] = useState("");
    const [syncState, setSyncState] = useState<TrackSyncState>({ state: "waiting" });
    const [retryNonce, setRetryNonce] = useState(0);

    const requestId = useRef(0);
    const seedTrackRef = useRef<TrackMetadataRecord>(seedTrack ?? {});
    const latestTrackId = useRef(trackId);

    useEffect(() => {
        seedTrackRef.current = seedTrack ?? {};
    }, [seedTrack]);

    useEffect(() => {
        latestTrackId.current = trackId;
    }, [trackId]);

    const metadataClues = useMemo(() => extractMetadataContextClues(trackContext), [trackContext]);
    const articleClues = useMemo(() => extractArticleContextClues(articles), [articles]);
    const clues = useMemo(() => ({ ...articleClues, ...metadataClues }), [articleClues, metadataClues]);
    const summary = useMemo(() => parseSummary(summaryText, clues), [summaryText, clues]);

    const applyView = useCallback((view?: TrackApiView) => {
        if (!view) return;

        setTrackContext(view.metadata ?? seedTrackRef.current ?? {});
        setArticles((view.articles ?? []) as CompleteArticle[]);
        setSummaryText(view.summary ?? "");
    }, []);

    const retry = useCallback(() => {
        if (!latestTrackId.current) return;
        setSyncState({ state: "waiting" });
        setRetryNonce((value) => value + 1);
    }, []);

    useEffect(() => {
        const currentRequestId = ++requestId.current;
        const controller = new AbortController();
        const activeTrackId = trackId;

        if (!activeTrackId) {
            setTrackContext({});
            setArticles([]);
            setSummaryText("");
            setSyncState({ state: "waiting" });
            return () => controller.abort();
        }

        async function run() {
            setTrackContext(seedTrackRef.current ?? {});
            setArticles([]);
            setSummaryText("");
            setSyncState({ state: "track" });

            let view = await fetchTrackView(activeTrackId!, controller.signal);
            if (controller.signal.aborted || currentRequestId !== requestId.current) return;
            applyView(view);

            for (const stage of STAGES) {
                if (!view.needsRefresh[stage]) continue;

                setSyncState(getLoadingState(stage));
                if (stage === "summary") {
                    setSummaryText("");
                    view = await streamTrackSummary(activeTrackId!, {
                        signal: controller.signal,
                        onDelta: (delta) => {
                            if (controller.signal.aborted || currentRequestId !== requestId.current) return;
                            setSummaryText((value) => value + delta);
                        },
                    });
                } else {
                    view = await refreshTrackStage(activeTrackId!, stage, false, controller.signal);
                }
                if (controller.signal.aborted || currentRequestId !== requestId.current) return;
                applyView(view);

                if (view.status[stage].status === "error") {
                    setSyncState({
                        state: "waiting",
                        message: view.lastError?.message ?? `Failed during ${stage}.`,
                        isError: true,
                    });
                    return;
                }
            }

            setSyncState({ state: "waiting" });
        }

        run().catch((error) => {
            if (controller.signal.aborted) return;

            const message = error instanceof Error ? error.message : "Failed to load track.";
            setSyncState({ state: "waiting", message, isError: true });
        });

        return () => controller.abort();
    }, [applyView, retryNonce, trackId]);

    return (
        <TrackContext.Provider value={trackContext}>
            <TrackSyncContext.Provider value={{ state: syncState, update: setSyncState, retry }}>
                <ArticleContext.Provider value={{ articles }}>
                    <SummaryContext.Provider value={{ summary }}>
                        <ContextClueContext.Provider value={clues}>
                            {children}
                        </ContextClueContext.Provider>
                    </SummaryContext.Provider>
                </ArticleContext.Provider>
            </TrackSyncContext.Provider>
        </TrackContext.Provider>
    );
}

export function PlaybackTrackRuntimeProvider({ children }: { children: React.ReactNode }) {
    const playback = useContext(PlaybackContext);
    const track = playback.playbackState?.item as Track | undefined;
    const seedTrack: TrackMetadataRecord = track ? { track } : {};

    return (
        <TrackRuntimeProvider trackId={track?.id} seedTrack={seedTrack}>
            {children}
        </TrackRuntimeProvider>
    );
}

function getLoadingState(stage: TrackStageName): TrackSyncState {
    if (stage === "metadata") return { state: "track", message: "Syncing track metadata..." };
    if (stage === "articles") return { state: "articles", message: "Finding reviews for track..." };
    return { state: "summary", message: "Generating summary..." };
}
