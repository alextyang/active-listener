"use server";

import { DEBUG_CACHE } from "@/app/(domain)/app/config";
import { CompleteTrack } from "@/app/(domain)/app/types";
import { saveItem } from "@/app/(domain)/database/kvStorage";
import { isCompleteTrack } from "@/app/(domain)/site/cache";
import { parseParameter } from "@/app/(domain)/utilities/fetch";



export async function POST(request: Request) {
    const trackObject = await parseParameter<CompleteTrack>(request);

    if (!trackObject?.metadata?.track || !isCompleteTrack(trackObject))
        return Response.json({ response: 'error' });

    await saveItem<CompleteTrack>(trackObject.metadata.track.id, trackObject);

    return Response.json({ response: 'success' });
}