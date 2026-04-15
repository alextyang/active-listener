import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppOrigin } from "@/app/(domain)/server/env";
import { createRequestId, getRequestOrigin, logTrackError, logTrackEvent } from "@/app/(domain)/server/observability";
import { getTrackView } from "@/app/(domain)/server/trackService";
import { toTrackApiView } from "@/app/(domain)/server/trackApi";

const trackIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9]+$/);

export async function GET(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
    const requestId = createRequestId();
    const trackIdResult = trackIdSchema.safeParse((await params).trackId);

    if (!trackIdResult.success) {
        logTrackEvent({
            event: "track.view.invalid_request",
            requestId,
            route: "/api/tracks/[trackId]",
            method: "GET",
            origin: getRequestOrigin(request),
            message: "invalid_track_id",
        });

        return NextResponse.json({ error: "invalid_track_id", requestId }, { status: 400, headers: buildHeaders(requestId) });
    }

    try {
        const view = await getTrackView(trackIdResult.data);
        const dto = toTrackApiView(view);

        logTrackEvent({
            event: "track.view.success",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]",
            method: "GET",
            origin: getRequestOrigin(request),
            status: 200,
        });

        return NextResponse.json(dto, { headers: buildHeaders(requestId) });
    } catch (error) {
        logTrackError({
            event: "track.view.error",
            requestId,
            trackId: trackIdResult.data,
            route: "/api/tracks/[trackId]",
            method: "GET",
            origin: getRequestOrigin(request),
            error,
        });

        return NextResponse.json({ error: "track_view_failed", requestId }, { status: 500, headers: buildHeaders(requestId) });
    }
}

function buildHeaders(requestId: string) {
    return {
        "x-request-id": requestId,
        "x-app-origin": getAppOrigin(),
    };
}
