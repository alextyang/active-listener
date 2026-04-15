import { describe, expect, it } from "vitest";
import { buildFallbackArticle } from "./articleService";

describe("buildFallbackArticle", () => {
    it("creates a usable article when only a search snippet is available", () => {
        const article = buildFallbackArticle({
            title: "A good review",
            link: "https://example.com/review",
            snippet: "  This review still gives enough context to summarize the song.  ",
            relevance: "track",
            type: "article",
        });

        expect(article).toMatchObject({
            title: "A good review",
            link: "https://example.com/review",
            excerpt: "This review still gives enough context to summarize the song.",
            siteName: "EXAMPLE",
            relevance: "track",
            type: "article",
        });
        expect(article?.excerptHash).toBeTruthy();
    });

    it("returns undefined when the search result has no usable snippet", () => {
        expect(buildFallbackArticle({
            title: "Empty",
            link: "https://example.com/review",
            snippet: "   ",
        })).toBeUndefined();
    });
});
