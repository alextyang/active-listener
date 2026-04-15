import { describe, expect, it } from "vitest";
import { buildSummaryInputHash } from "./summaryService";
import { CompleteArticle, TrackMetadataRecord } from "../app/types";

describe("buildSummaryInputHash", () => {
    it("is stable for the same metadata and article order", () => {
        const metadata: TrackMetadataRecord = {
            track: {
                id: "track-1",
                name: "Track 1",
            } as any,
        };

        const article: CompleteArticle = {
            link: "https://example.com/a",
            title: "A",
            excerpt: "One",
            excerptHash: "hash-a",
            siteName: "Example",
            byline: "Author",
            type: "article",
            relevance: "track",
            wordCount: 100,
        };

        expect(buildSummaryInputHash(metadata, [article])).toBe(buildSummaryInputHash(metadata, [article]));
    });

    it("changes when article content changes", () => {
        const metadata: TrackMetadataRecord = {
            track: {
                id: "track-1",
                name: "Track 1",
            } as any,
        };

        const baseArticle: CompleteArticle = {
            link: "https://example.com/a",
            title: "A",
            excerpt: "One",
            excerptHash: "hash-a",
            siteName: "Example",
            byline: "Author",
            type: "article",
            relevance: "track",
            wordCount: 100,
        };

        const firstHash = buildSummaryInputHash(metadata, [baseArticle]);
        const secondHash = buildSummaryInputHash(metadata, [{ ...baseArticle, excerptHash: "hash-b" }]);

        expect(firstHash).not.toBe(secondHash);
    });

    it("changes when the article order changes", () => {
        const metadata: TrackMetadataRecord = {
            track: {
                id: "track-1",
                name: "Track 1",
            } as any,
        };

        const first: CompleteArticle = {
            link: "https://example.com/a",
            title: "A",
            excerpt: "One",
            excerptHash: "hash-a",
            siteName: "Example",
            byline: "Author",
            type: "article",
            relevance: "track",
            wordCount: 100,
        };
        const second: CompleteArticle = {
            ...first,
            link: "https://example.com/b",
            title: "B",
            excerptHash: "hash-b",
        };

        expect(buildSummaryInputHash(metadata, [first, second])).not.toBe(buildSummaryInputHash(metadata, [second, first]));
    });
});
