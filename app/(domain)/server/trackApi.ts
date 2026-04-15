import { Album, Artist } from "@spotify/web-api-ts-sdk";
import { CompleteArticle, PersistedTrackRecord, TrackApiArticle, TrackApiView, TrackMetadataRecord, TrackStageName, TrackView } from "../app/types";

export function toTrackApiView(record: PersistedTrackRecord | TrackView): TrackApiView {
    return {
        trackId: record.trackId,
        metadata: stripMetadataForApi(record.metadata),
        articles: (record.articles ?? []).map(stripArticleForApi),
        summary: resolveSummary(record.summary),
        status: record.status,
        lastError: record.lastError,
        needsRefresh: "needsRefresh" in record ? record.needsRefresh : computeNeedsRefresh(record),
    };
}

export function stripArticleForApi(article: CompleteArticle): TrackApiArticle {
    const { content: _content, ...rest } = article;
    return rest;
}

export function stripMetadataForApi(metadata?: TrackMetadataRecord): TrackMetadataRecord | undefined {
    if (!metadata) return metadata;
    const safeMetadata: any = metadata;

    return {
        track: safeMetadata.track ? {
            ...safeMetadata.track,
            album: stripAlbumForApi(safeMetadata.track.album as unknown as Album),
            artists: (safeMetadata.track.artists ?? []).map((artist: Artist) => stripArtistForApi(artist)),
        } : undefined,
        album: safeMetadata.album ? stripAlbumForApi(safeMetadata.album as unknown as Album) : undefined,
        artists: safeMetadata.artists ? safeMetadata.artists.map((artist: Artist) => stripArtistForApi(artist)) : undefined,
        siblingAlbums: safeMetadata.siblingAlbums?.map((album: Album) => stripAlbumForApi(album)),
        topTracks: safeMetadata.topTracks?.map((entry: any) => ({
            tracks: entry.tracks.map((track: any) => ({
                ...track,
                album: stripAlbumForApi(track.album as unknown as Album),
                artists: track.artists.map((artist: Artist) => stripArtistForApi(artist)),
            })),
        })),
        palette: safeMetadata.palette,
    } as any;
}

export function stripAlbumForApi(album: Album): Album {
    return {
        ...(album as Album),
        images: album.images?.slice(0, 3).map((image) => ({
            url: image.url,
            width: image.width,
            height: image.height,
        })) as Album["images"],
    } as unknown as Album;
}

export function stripArtistForApi(artist: Artist): Artist {
    return {
        ...(artist as Artist),
        genres: artist.genres?.slice(0, 20),
        images: artist.images?.slice(0, 3).map((image) => ({
            url: image.url,
            width: image.width,
            height: image.height,
        })) as Artist["images"],
    } as unknown as Artist;
}

function resolveSummary(summary: PersistedTrackRecord["summary"] | TrackView["summary"] | undefined) {
    if (!summary) return undefined;
    if (typeof summary === "string") return summary;
    return summary.text;
}

function computeNeedsRefresh(record: PersistedTrackRecord): Record<TrackStageName, boolean> {
    const status = record.status;
    return {
        metadata: status.metadata.status !== "ready" || !record.metadata,
        articles: status.articles.status !== "ready" || !record.articlesHash,
        summary: status.summary.status !== "ready" || !record.summary,
    };
}
