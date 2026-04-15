import { randomUUID } from "crypto";
import { TrackStageName } from "../app/types";

export type TrackLogEvent = {
    event: string;
    requestId: string;
    trackId?: string;
    stage?: TrackStageName;
    route?: string;
    method?: string;
    origin?: string;
    status?: number;
    cache?: string;
    lock?: string;
    rateLimit?: string;
    durationMs?: number;
    retryAfterSeconds?: number;
    message?: string;
    error?: string;
};

export function createRequestId(): string {
    return randomUUID();
}

export function getRequestOrigin(request: Request): string | undefined {
    return request.headers.get("origin") ?? request.headers.get("referer") ?? undefined;
}

export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor)
        return forwardedFor.split(",")[0]?.trim() || "unknown";

    return request.headers.get("x-real-ip")
        ?? request.headers.get("cf-connecting-ip")
        ?? "unknown";
}

export function logTrackEvent(event: TrackLogEvent) {
    console.info(JSON.stringify({
        ts: new Date().toISOString(),
        ...event,
    }));
}

export function logTrackError(event: Omit<TrackLogEvent, "error"> & { error: unknown }) {
    const error = event.error instanceof Error
        ? event.error.message
        : typeof event.error === "string"
            ? event.error
            : "Unknown error";

    console.error(JSON.stringify({
        ts: new Date().toISOString(),
        ...event,
        error,
    }));
}
