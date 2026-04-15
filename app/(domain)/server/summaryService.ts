import { createHash } from "crypto";
import OpenAI from "openai";
import { SUMMARY_MAX_INPUT_CHARS, SUMMARY_MAX_TOKENS_OUT, SUMMARY_MODEL, SUMMARY_PROMPT, SUMMARY_PROMPT_VERSION } from "../app/config";
import { CompleteArticle, TrackMetadataRecord } from "../app/types";
import { getServerEnv } from "./env";

let openaiClient: OpenAI | undefined;

function getOpenAIClient() {
    if (openaiClient) return openaiClient;

    const env = getServerEnv();
    if (!env.OPENAI_API_KEY)
        throw new Error("OpenAI credentials are not configured.");

    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return openaiClient;
}

export function buildSummaryInputHash(metadata: TrackMetadataRecord, articles: CompleteArticle[]): string {
    return createHash("sha256").update(JSON.stringify({
        promptVersion: SUMMARY_PROMPT_VERSION,
        model: SUMMARY_MODEL,
        trackId: metadata?.track?.id,
        metadataHashSource: metadata?.track?.name,
        articleHashes: articles.map((article) => article.excerptHash ?? `${article.link}:${article.updatedAt}`),
    })).digest("hex");
}

export async function generateTrackSummary(metadata: TrackMetadataRecord, articles: CompleteArticle[]): Promise<string> {
    return streamTrackSummary(metadata, articles);
}

export async function streamTrackSummary(
    metadata: TrackMetadataRecord,
    articles: CompleteArticle[],
    onDelta?: (delta: string) => void | Promise<void>,
): Promise<string> {
    const track = metadata?.track;
    if (!track) return "";

    if (articles.length === 0) {
        const fallback = `No reviews found for ${track.name} by ${track.artists.map((artist) => artist.name).join(", ")} from ${track.album.name}.`;
        await onDelta?.(fallback);
        return fallback;
    }

    const completion = await getOpenAIClient().chat.completions.create({
        model: SUMMARY_MODEL,
        max_tokens: SUMMARY_MAX_TOKENS_OUT,
        temperature: 0.3,
        stream: true,
        messages: [
            { role: "system", content: SUMMARY_PROMPT },
            { role: "user", content: buildSummaryPrompt(metadata, articles) },
        ],
    });

    let summary = "";

    for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (!delta) continue;

        summary += delta;
        await onDelta?.(delta);
    }

    return summary.trim();
}

function buildSummaryPrompt(metadata: TrackMetadataRecord, articles: CompleteArticle[]) {
    const track = metadata?.track;
    if (!track) return "";

    let remainingChars = SUMMARY_MAX_INPUT_CHARS;
    const parts = [
        `Target song: ${track.name}`,
        `Target album: ${track.album.name}`,
        `Artist(s): ${track.artists.map((artist) => artist.name).join(", ")}`,
    ];
    remainingChars -= parts.join("\n").length;

    for (let index = 0; index < articles.length; index++) {
        const article = articles[index];
        if (remainingChars <= 0) break;

        const header = `\n\nArticle ${index + 1} (by ${article.byline || "Unknown"} from ${article.siteName}):\n`;
        const body = article.excerpt.slice(0, Math.max(0, remainingChars - header.length));
        parts.push(header + body);
        remainingChars -= header.length + body.length;
    }

    return parts.join("\n");
}
