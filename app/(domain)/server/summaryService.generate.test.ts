import { afterEach, describe, expect, it, vi } from "vitest";
import { SUMMARY_MAX_INPUT_CHARS } from "../app/config";
import type { CompleteArticle, TrackMetadataRecord } from "../app/types";

const completionCreate = vi.fn();
let mockedOpenAiKey = "test-openai-key";

vi.mock("openai", () => ({
    default: class OpenAI {
        chat = {
            completions: {
                create: completionCreate,
            },
        };
    },
}));

vi.mock("./env", () => ({
    getServerEnv: () => ({
        OPENAI_API_KEY: mockedOpenAiKey,
    }),
}));

describe("generateTrackSummary", () => {
    afterEach(() => {
        mockedOpenAiKey = "test-openai-key";
        completionCreate.mockReset();
        vi.resetModules();
    });

    it("returns a local fallback when no articles are available", async () => {
        const { generateTrackSummary } = await import("./summaryService");

        await expect(generateTrackSummary(makeMetadata(), [])).resolves.toContain("No reviews found for Track 1 by Artist 1 from Album 1.");
        expect(completionCreate).not.toHaveBeenCalled();
    });

    it("throws when the OpenAI key is missing and article summarization is required", async () => {
        mockedOpenAiKey = "";
        const { generateTrackSummary } = await import("./summaryService");

        await expect(generateTrackSummary(makeMetadata(), [makeArticle("a", "one")])).rejects.toThrow("OpenAI credentials are not configured.");
        expect(completionCreate).not.toHaveBeenCalled();
    });

    it("trims the model response content", async () => {
        completionCreate.mockResolvedValue(makeCompletionStream(["  Trimmed summary.  "]));
        const { generateTrackSummary } = await import("./summaryService");

        await expect(generateTrackSummary(makeMetadata(), [makeArticle("a", "one")])).resolves.toBe("Trimmed summary.");
        expect(completionCreate).toHaveBeenCalledOnce();
    });

    it("limits the prompt size before sending it to OpenAI", async () => {
        completionCreate.mockResolvedValue(makeCompletionStream(["summary"]));
        const { generateTrackSummary } = await import("./summaryService");

        await generateTrackSummary(makeMetadata(), [
            makeArticle("a", "a".repeat(SUMMARY_MAX_INPUT_CHARS)),
            makeArticle("b", "b".repeat(SUMMARY_MAX_INPUT_CHARS)),
            makeArticle("c", "c".repeat(SUMMARY_MAX_INPUT_CHARS)),
        ]);

        const request = completionCreate.mock.calls[0]?.[0];
        const userPrompt = request?.messages?.[1]?.content;

        expect(typeof userPrompt).toBe("string");
        expect(userPrompt.length).toBeLessThanOrEqual(SUMMARY_MAX_INPUT_CHARS + 32);
        expect(userPrompt).not.toContain("c".repeat(500));
    });

    it("streams summary deltas to the caller while building the final summary", async () => {
        completionCreate.mockResolvedValue(makeCompletionStream(["First ", "second", " part."]));
        const onDelta = vi.fn();
        const { streamTrackSummary } = await import("./summaryService");

        await expect(streamTrackSummary(makeMetadata(), [makeArticle("a", "one")], onDelta)).resolves.toBe("First second part.");
        expect(onDelta).toHaveBeenNthCalledWith(1, "First ");
        expect(onDelta).toHaveBeenNthCalledWith(2, "second");
        expect(onDelta).toHaveBeenNthCalledWith(3, " part.");
    });
});

function makeMetadata(): TrackMetadataRecord {
    return {
        track: {
            id: "track-1",
            name: "Track 1",
            album: {
                id: "album-1",
                name: "Album 1",
            },
            artists: [{ id: "artist-1", name: "Artist 1" }],
        } as any,
    };
}

function makeArticle(id: string, excerpt: string): CompleteArticle {
    return {
        link: `https://example.com/${id}`,
        title: `Article ${id}`,
        excerpt,
        excerptHash: `hash-${id}`,
        siteName: "Example",
        byline: "Author",
        type: "article",
        relevance: "track",
        wordCount: excerpt.split(/\s+/).filter(Boolean).length || 1,
        updatedAt: "2026-04-13T00:00:00.000Z",
    };
}

function makeCompletionStream(chunks: string[]) {
    return {
        async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) {
                yield {
                    choices: [{
                        delta: {
                            content: chunk,
                        },
                    }],
                };
            }
        },
    };
}
