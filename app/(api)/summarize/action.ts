"use server";

import { DEBUG_SUMMARY_STREAM, SUMMARY_MAX_TOKENS_IN, SUMMARY_MAX_TOKENS_OUT, SUMMARY_MODEL, SUMMARY_PROMPT } from "@/app/(domain)/app/config";
import { SimpleArticle, SummarizeRequest } from "@/app/(domain)/app/types";
import { decompressString } from "@/app/(domain)/utilities/compress";
import { parseParameter } from "@/app/(domain)/utilities/fetch";
import { StreamingTextResponse, streamText, streamToResponse } from "ai";
import { createStreamableValue, readStreamableValue } from "ai/rsc";
import { openai } from '@ai-sdk/openai';


export async function startSummaryStream(req: SummarizeRequest) {
    if (!req || !req.track || !req.articles || req.articles.length === 0) return createStreamableValue(undefined).done().value;

    let prompt = `Target song: ${req.track.name}, Target album: ${req.track.album.name}, Artist(s): ${req.track.artists.map((artist) => artist.name)}\n` + req.articles.map((article, index) => {
        return `\n\nArticle ${index + 1}:\n (by ${article?.byline} from ${article?.siteName})` + decompressString(article?.compressedContent ?? '');
    }).join('\n');

    if (prompt.length > SUMMARY_MAX_TOKENS_IN * 5) prompt = prompt.slice(0, SUMMARY_MAX_TOKENS_IN * 5);

    if (DEBUG_SUMMARY_STREAM) console.log('[SUMMARY] Prompting summary for ' + req.track.name + ' with token count:', (prompt.length / 5) + (SUMMARY_PROMPT.length / 5));

    const stream = createStreamableValue('');

    (async () => {
        const { textStream } = await streamText({
            model: openai(SUMMARY_MODEL),
            system: SUMMARY_PROMPT,
            prompt,
            maxTokens: SUMMARY_MAX_TOKENS_OUT
        });

        for await (const delta of textStream) {
            stream.update(delta);
        }

        stream.done();
        if (DEBUG_SUMMARY_STREAM) console.log('[SUMMARY] Summary stream done for ' + req.track.name);
    })();

    return stream.value;
}