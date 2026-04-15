import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppOrigin } from "@/app/(domain)/server/env";
import { createRequestId, getClientIp, getRequestOrigin, logTrackError, logTrackEvent } from "@/app/(domain)/server/observability";
import { isTrustedAppRequest } from "@/app/(domain)/server/requestOrigin";
import { consumeTrackRefreshQuota, getRefreshClientId } from "@/app/(domain)/server/trackRefreshGuard";
import { refreshTrackStage } from "@/app/(domain)/server/trackService";
import { toTrackApiView } from "@/app/(domain)/server/trackApi";

const trackIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9]+$/);
const refreshRequestSchema = z.object({
    stage: z.enum(["metadata", "articles", "summary"]),
    force: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
    const requestId = createRequestId();
    const trackIdResult = trackIdSchema.safeParse((await params).trackId);

    if (!trackIdResult.success) {
        logTrackEvent({
            event: "track.refresh.invalid_request",
            requestId,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            message: "invalid_track_id",
        });

        return NextResponse.json({ error: "invalid_track_id", requestId }, { status: 400, headers: buildHeaders(requestId) });
    }

    if (!isTrustedAppRequest(request)) {
        logTrackEvent({
            event: "track.refresh.invalid_request",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            message: "invalid_origin",
        });

        return NextResponse.json({ error: "invalid_origin", requestId }, { status: 403, headers: buildHeaders(requestId) });
    }

    const payloadResult = await parseRefreshPayload(request);
    if (!payloadResult.success) {
        logTrackEvent({
            event: "track.refresh.invalid_request",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            message: payloadResult.error,
        });

        return NextResponse.json({ error: payloadResult.error, requestId }, { status: 400, headers: buildHeaders(requestId) });
    }

    const clientIp = getClientIp(request);
    const clientId = getRefreshClientId(trackIdResult.data, clientIp);
    const quota = await consumeTrackRefreshQuota(trackIdResult.data, clientId);

    if (!quota.allowed) {
        logTrackEvent({
            event: "track.refresh.rate_limited",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            rateLimit: clientId,
            retryAfterSeconds: quota.retryAfterSeconds,
        });

        return NextResponse.json(
            { error: "rate_limited", requestId, retryAfterSeconds: quota.retryAfterSeconds },
            {
                status: 429,
                headers: {
                    ...buildHeaders(requestId),
                    "retry-after": String(quota.retryAfterSeconds),
                    "x-rate-limit-remaining": "0",
                },
            },
        );
    }

    try {
        const view = await refreshTrackStage(trackIdResult.data, payloadResult.data);
        const dto = toTrackApiView(view);

        logTrackEvent({
            event: "track.refresh.success",
            requestId,
            trackId: trackIdResult.data,
            stage: payloadResult.data.stage,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            status: 200,
            rateLimit: `${clientId}:${quota.remaining}`,
        });

        return NextResponse.json(dto, {
            headers: {
                ...buildHeaders(requestId),
                "x-rate-limit-remaining": String(quota.remaining),
            },
        });
    } catch (error) {
        logTrackError({
            event: "track.refresh.error",
            requestId,
            trackId: trackIdResult.data,
            stage: payloadResult.data.stage,
            route: "/api/tracks/[trackId]/refresh",
            method: "POST",
            origin: getRequestOrigin(request),
            error,
        });

        return NextResponse.json({ error: "track_refresh_failed", requestId }, { status: 500, headers: buildHeaders(requestId) });
    }
}

async function parseRefreshPayload(request: Request): Promise<{ success: true; data: { stage: "metadata" | "articles" | "summary"; force?: boolean } } | { success: false; error: string }> {
    try {
        const body = await request.json();
        const parsed = refreshRequestSchema.safeParse(body);
        if (!parsed.success)
            return { success: false, error: "invalid_refresh_payload" };

        return { success: true, data: parsed.data };
    } catch {
        return { success: false, error: "invalid_json" };
    }
}

function buildHeaders(requestId: string) {
    return {
        "x-request-id": requestId,
        "x-app-origin": getAppOrigin(),
    };
}
