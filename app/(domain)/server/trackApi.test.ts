import { describe, expect, it } from "vitest";
import { toTrackApiView } from "./trackApi";
import { PersistedTrackRecord, TrackView } from "../app/types";

describe("toTrackApiView", () => {
    it("strips article bodies and preserves runtime fields", () => {
        const record: PersistedTrackRecord = {
            trackId: "track-1",
            metadata: {
                track: {
                    id: "track-1",
                    name: "Track 1",
                    uri: "spotify:track:track-1",
                    album: {
                        id: "album-1",
                        name: "Album 1",
                        uri: "spotify:album:album-1",
                        genres: ["indie"],
                        images: [{ url: "https://example.com/album.jpg", width: 640, height: 640 }] as any,
                    } as any,
                    artists: [{
                        id: "artist-1",
                        name: "Artist 1",
                        uri: "spotify:artist:artist-1",
                        genres: ["rock"],
                        images: [{ url: "https://example.com/artist.jpg", width: 300, height: 300 }] as any,
                    } as any],
                } as any,
                artists: [{
                    id: "artist-1",
                    name: "Artist 1",
                    uri: "spotify:artist:artist-1",
                    genres: ["rock"],
                    images: [{ url: "https://example.com/artist.jpg", width: 300, height: 300 }] as any,
                } as any],
            } as any,
            articles: [{
                link: "https://example.com/article",
                title: "Article",
                content: "full body",
                excerpt: "summary",
                siteName: "Example",
                byline: "Author",
                type: "article",
                relevance: "track",
                wordCount: 120,
            }],
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            createdAt: "2026-04-13T00:00:00.000Z",
            updatedAt: "2026-04-13T00:00:00.000Z",
        };

        const dto = toTrackApiView(record);

        expect(dto.articles[0]).not.toHaveProperty("content");
        expect(dto.metadata?.track?.album.images?.[0].url).toBe("https://example.com/album.jpg");
        expect(dto.metadata?.artists?.[0].genres).toEqual(["rock"]);
        expect(dto.trackId).toBe("track-1");
    });

    it("computes refresh needs when ready stages are missing required payloads", () => {
        const record: PersistedTrackRecord = {
            trackId: "track-2",
            metadata: undefined,
            articles: [],
            articlesHash: undefined,
            summary: undefined,
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            createdAt: "2026-04-13T00:00:00.000Z",
            updatedAt: "2026-04-13T00:00:00.000Z",
        };

        const dto = toTrackApiView(record);

        expect(dto.needsRefresh).toEqual({
            metadata: true,
            articles: true,
            summary: true,
        });
    });

    it("passes through string summaries from a track view and trims nested arrays for api safety", () => {
        const view: TrackView = {
            trackId: "track-3",
            metadata: {
                track: {
                    id: "track-3",
                    name: "Track 3",
                    album: {
                        id: "album-3",
                        name: "Album 3",
                        images: [
                            { url: "https://example.com/1.jpg", width: 640, height: 640 },
                            { url: "https://example.com/2.jpg", width: 320, height: 320 },
                            { url: "https://example.com/3.jpg", width: 64, height: 64 },
                            { url: "https://example.com/4.jpg", width: 32, height: 32 },
                        ],
                    },
                    artists: [{
                        id: "artist-3",
                        name: "Artist 3",
                        genres: Array.from({ length: 30 }, (_, index) => `genre-${index}`),
                        images: [
                            { url: "https://example.com/a1.jpg", width: 640, height: 640 },
                            { url: "https://example.com/a2.jpg", width: 320, height: 320 },
                            { url: "https://example.com/a3.jpg", width: 64, height: 64 },
                            { url: "https://example.com/a4.jpg", width: 32, height: 32 },
                        ],
                    } as any],
                } as any,
            },
            articles: [],
            summary: "summary from view",
            status: {
                metadata: { status: "ready" },
                articles: { status: "ready" },
                summary: { status: "ready" },
            },
            lastError: undefined,
            needsRefresh: {
                metadata: false,
                articles: false,
                summary: false,
            },
        };

        const dto = toTrackApiView(view);

        expect(dto.summary).toBe("summary from view");
        expect(dto.metadata?.track?.album.images).toHaveLength(3);
        expect((dto.metadata?.track?.artists?.[0] as any)?.images).toHaveLength(3);
        expect((dto.metadata?.track?.artists?.[0] as any)?.genres).toHaveLength(20);
        expect(dto.needsRefresh.summary).toBe(false);
    });
});
