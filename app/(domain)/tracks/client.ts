import { TrackApiView, TrackRefreshRequest, TrackStageName, TrackSummaryStreamEvent, TrackSummaryStreamRequest } from "../app/types";
import { APP_ORIGIN_HEADER } from "../server/requestOrigin";

export async function fetchTrackView(trackId: string, signal?: AbortSignal): Promise<TrackApiView> {
    const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, {
        method: "GET",
        cache: "no-store",
        signal,
    });

    if (!response.ok)
        throw new Error(await readErrorMessage(response, `Failed to load track view (${response.status})`));

    return response.json() as Promise<TrackApiView>;
}

export async function refreshTrackStage(trackId: string, stage: TrackStageName, force = false, signal?: AbortSignal): Promise<TrackApiView> {
    const payload: TrackRefreshRequest = { stage, force };
    const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}/refresh`, {
        method: "POST",
        cache: "no-store",
        headers: buildTrackRequestHeaders(),
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok)
        throw new Error(await readErrorMessage(response, `Failed to refresh ${stage} stage (${response.status})`));

    return response.json() as Promise<TrackApiView>;
}

export async function streamTrackSummary(
    trackId: string,
    options?: {
        force?: boolean;
        signal?: AbortSignal;
        onDelta?: (delta: string) => void;
    },
): Promise<TrackApiView> {
    const payload: TrackSummaryStreamRequest = { force: options?.force };
    const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}/summary/stream`, {
        method: "POST",
        cache: "no-store",
        headers: buildTrackRequestHeaders(),
        body: JSON.stringify(payload),
        signal: options?.signal,
    });

    if (!response.ok)
        throw new Error(await readErrorMessage(response, `Failed to refresh summary stage (${response.status})`));

    if (!response.body)
        return fetchTrackView(trackId, options?.signal);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalView: TrackApiView | undefined = undefined;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const next = consumeSummaryStreamBuffer(buffer);
        buffer = next.rest;

        for (const event of next.events) {
            if (event.type === "delta") {
                options?.onDelta?.(event.delta);
                continue;
            }

            if (event.type === "error")
                throw new Error(event.error);

            finalView = event.view;
        }
    }

    buffer += decoder.decode();
    const next = consumeSummaryStreamBuffer(buffer);

    for (const event of next.events) {
        if (event.type === "delta") {
            options?.onDelta?.(event.delta);
            continue;
        }

        if (event.type === "error")
            throw new Error(event.error);

        finalView = event.view;
    }

    if (next.rest.trim().length > 0)
        throw new Error("Received a malformed summary stream payload.");

    return finalView ?? fetchTrackView(trackId, options?.signal);
}

export function consumeSummaryStreamBuffer(buffer: string): { events: TrackSummaryStreamEvent[]; rest: string } {
    const events: TrackSummaryStreamEvent[] = [];
    const lines = buffer.split("\n");
    const rest = lines.pop() ?? "";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        events.push(JSON.parse(trimmed) as TrackSummaryStreamEvent);
    }

    return { events, rest };
}

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const payload = await response.json() as { error?: string; retryAfterSeconds?: number };
        if (payload?.error === "rate_limited" && payload.retryAfterSeconds) {
            return `${fallback}. Retry after ${payload.retryAfterSeconds}s.`;
        }
        if (payload?.error)
            return `${fallback}: ${payload.error}`;
    } catch {
        // Ignore non-JSON error bodies.
    }

    return fallback;
}

function buildTrackRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    const origin = getClientOrigin();
    if (origin)
        headers[APP_ORIGIN_HEADER] = origin;

    return headers;
}

function getClientOrigin(): string | undefined {
    if (typeof window === "undefined")
        return undefined;

    return window.location.origin;
}
