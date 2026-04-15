import { z } from "zod";
import { getAppOrigin } from "@/app/(domain)/server/env";
import { createRequestId, getClientIp, getRequestOrigin, logTrackError, logTrackEvent } from "@/app/(domain)/server/observability";
import { isTrustedAppRequest } from "@/app/(domain)/server/requestOrigin";
import { consumeTrackRefreshQuota, getRefreshClientId } from "@/app/(domain)/server/trackRefreshGuard";
import { toTrackApiView } from "@/app/(domain)/server/trackApi";
import { streamTrackSummaryStage } from "@/app/(domain)/server/trackService";

const trackIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9]+$/);
const summaryStreamRequestSchema = z.object({
    force: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
    const requestId = createRequestId();
    const trackIdResult = trackIdSchema.safeParse((await params).trackId);

    if (!trackIdResult.success) {
        logTrackEvent({
            event: "track.summary_stream.invalid_request",
            requestId,
            route: "/api/tracks/[trackId]/summary/stream",
            method: "POST",
            origin: getRequestOrigin(request),
            message: "invalid_track_id",
        });

        return Response.json({ error: "invalid_track_id", requestId }, { status: 400, headers: buildHeaders(requestId) });
    }

    if (!isTrustedAppRequest(request)) {
        logTrackEvent({
            event: "track.summary_stream.invalid_request",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/summary/stream",
            method: "POST",
            origin: getRequestOrigin(request),
            message: "invalid_origin",
        });

        return Response.json({ error: "invalid_origin", requestId }, { status: 403, headers: buildHeaders(requestId) });
    }

    const payloadResult = await parseSummaryStreamPayload(request);
    if (!payloadResult.success) {
        logTrackEvent({
            event: "track.summary_stream.invalid_request",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/summary/stream",
            method: "POST",
            origin: getRequestOrigin(request),
            message: payloadResult.error,
        });

        return Response.json({ error: payloadResult.error, requestId }, { status: 400, headers: buildHeaders(requestId) });
    }

    const clientIp = getClientIp(request);
    const clientId = getRefreshClientId(trackIdResult.data, clientIp);
    const quota = await consumeTrackRefreshQuota(trackIdResult.data, clientId);

    if (!quota.allowed) {
        logTrackEvent({
            event: "track.summary_stream.rate_limited",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]/summary/stream",
            method: "POST",
            origin: getRequestOrigin(request),
            rateLimit: clientId,
            retryAfterSeconds: quota.retryAfterSeconds,
        });

        return Response.json(
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            let isClosed = false;

            const closeController = () => {
                if (isClosed)
                    return;

                isClosed = true;

                try {
                    controller.close();
                } catch (error) {
                    if (!isClosedControllerError(error))
                        throw error;
                }
            };

            const writeEvent = (event: object) => {
                if (isClosed)
                    return;

                try {
                    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
                } catch (error) {
                    if (isClosedControllerError(error)) {
                        isClosed = true;
                        return;
                    }

                    throw error;
                }
            };

            request.signal.addEventListener("abort", closeController, { once: true });

            void (async () => {
                try {
                    const view = await streamTrackSummaryStage(trackIdResult.data, payloadResult.data, (delta) => {
                        writeEvent({ type: "delta", delta });
                    });
                    const dto = toTrackApiView(view);

                    if (dto.status.summary.status === "error") {
                        writeEvent({
                            type: "error",
                            error: dto.lastError?.message ?? "track_refresh_failed",
                        });
                    } else {
                        logTrackEvent({
                            event: "track.summary_stream.success",
                            requestId,
                            trackId: trackIdResult.data,
                            route: "/api/tracks/[trackId]/summary/stream",
                            method: "POST",
                            origin: getRequestOrigin(request),
                            status: 200,
                            rateLimit: `${clientId}:${quota.remaining}`,
                        });
                        writeEvent({ type: "complete", view: dto });
                    }
                } catch (error) {
                    logTrackError({
                        event: "track.summary_stream.error",
                        requestId,
                        trackId: trackIdResult.data,
                        route: "/api/tracks/[trackId]/summary/stream",
                        method: "POST",
                        origin: getRequestOrigin(request),
                        error,
                    });
                    writeEvent({
                        type: "error",
                        error: error instanceof Error ? error.message : "track_refresh_failed",
                    });
                } finally {
                    closeController();
                }
            })();
        },
    });

    return new Response(stream, {
        headers: {
            ...buildHeaders(requestId),
            "cache-control": "no-store",
            "content-type": "application/x-ndjson; charset=utf-8",
            "x-rate-limit-remaining": String(quota.remaining),
        },
    });
}

async function parseSummaryStreamPayload(request: Request): Promise<{ success: true; data: { force?: boolean } } | { success: false; error: string }> {
    try {
        const body = await request.json();
        const parsed = summaryStreamRequestSchema.safeParse(body);
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

function isClosedControllerError(error: unknown) {
    return error instanceof TypeError && error.message.includes("Controller is already closed");
}
