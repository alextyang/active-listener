import { describe, expect, it } from "vitest";
import { filterArticlesForRelevance } from "./helpers";
import { Track } from "@spotify/web-api-ts-sdk";

describe("filterArticlesForRelevance", () => {
    it("filters duplicates and blacklisted results while keeping relevant matches", () => {
        const track = {
            name: "Motion",
            album: { name: "Motion" },
            artists: [{ name: "Tycho" }],
        } as unknown as Track;

        const results = filterArticlesForRelevance([
            { title: "Motion review", link: "https://example.com/review" },
            { title: "Motion review", link: "https://example.com/review-duplicate" },
            { title: "Watch Motion live", link: "https://example.com/video" },
            { title: "Tycho interview", link: "https://example.com/interview" },
        ], track);

        expect(results).toHaveLength(2);
        expect(results[0]?.relevance).toBe("track");
        expect(results[1]?.relevance).toBe("artist");
    });
});

