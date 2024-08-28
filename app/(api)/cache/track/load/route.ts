"use server";

import { CompleteTrack } from "@/app/(domain)/app/types";
import { loadItem } from "@/app/(domain)/database/kvStorage";
import { parseParameter } from "@/app/(domain)/utilities/fetch";

export async function POST(request: Request) {
    const trackID = await parseParameter<string>(request);

    if (!trackID)
        return Response.error();

    const trackObject = await loadItem<CompleteTrack>(trackID);

    return Response.json({ response: trackObject });
}