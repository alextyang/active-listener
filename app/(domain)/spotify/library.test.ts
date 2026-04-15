import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Playlist, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";

const storageState = new Map<string, unknown>();

const loadLocalItem = vi.fn((key: string) => storageState.get(key));
const saveLocalItem = vi.fn((key: string, value: unknown) => {
    storageState.set(key, value);
});
const wait = vi.fn(async () => undefined);

vi.mock("../browser/localStorage", () => ({
    loadLocalItem,
    saveLocalItem,
}));

vi.mock("../utilities/fetch", () => ({
    wait,
}));

describe("spotify library sync", () => {
    let library: typeof import("./library");

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-13T00:00:00.000Z"));
        storageState.clear();
        vi.clearAllMocks();
        vi.resetModules();
        library = await import("./library");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("namespaces playlist cache keys by user and cache version", () => {
        const first = library.buildPlaylistCacheKeys({ userId: "user-1" });
        const second = library.buildPlaylistCacheKeys({ userId: "user-2" });
        const versioned = library.buildPlaylistCacheKeys({ userId: "user-1", cacheVersion: "v3" });

        expect(first.playlistDictKey).toBe("playlistDict:v2:user-1");
        expect(first.lastSyncKey).toBe("lastPlaylistSync:v2:user-1");
        expect(second.playlistDictKey).toBe("playlistDict:v2:user-2");
        expect(versioned.playlistDictKey).toBe("playlistDict:v3:user-1");
        expect(versioned.playlistDictKey).not.toBe(first.playlistDictKey);
    });

    it("honors the playlist freshness window unless refresh is forced", () => {
        const now = 1_000_000;
        const freshSyncAt = now - 10_000;
        const staleSyncAt = now - 20 * 60 * 1000;

        vi.setSystemTime(new Date(now));

        expect(library.shouldAutoSyncPlaylists({ state: "waiting" }, false, freshSyncAt)).toBe(false);
        expect(library.shouldAutoSyncPlaylists({ state: "waiting" }, false, staleSyncAt)).toBe(true);
        expect(library.shouldAutoSyncPlaylists({ state: "waiting" }, true, freshSyncAt)).toBe(true);
    });

    it("dedupes concurrent syncs for the same account and saves once", async () => {
        const playlistPage = {
            items: [makeSimplifiedPlaylist("playlist-1", "snapshot-a")],
            next: null,
        } as any;
        const playlistRecord = makePopulatedPlaylist("playlist-1", ["track-1", "track-1"]);
        const currentUserPlaylists = vi.fn(async () => playlistPage);
        const getPlaylist = vi.fn(async () => playlistRecord);
        const getPlaylistItems = vi.fn();
        const client = makeClient({ currentUserPlaylists, getPlaylist, getPlaylistItems });

        const firstSync = library.syncUserPlaylists(client, { state: "waiting" }, false, undefined, {
            identity: { userId: "user-1" },
        });
        const secondSync = library.syncUserPlaylists(client, { state: "waiting" }, false, undefined, {
            identity: { userId: "user-1" },
        });

        const [firstResult, secondResult] = await Promise.all([firstSync, secondSync]);

        expect(firstResult).toEqual(secondResult);
        expect(firstResult?.playlists["playlist-1"]?.snapshot_id).toBe("snapshot-a");

        expect(currentUserPlaylists).toHaveBeenCalledTimes(1);
        expect(getPlaylist).toHaveBeenCalledTimes(1);
        expect(saveLocalItem).toHaveBeenCalledTimes(2);
        expect(saveLocalItem).toHaveBeenCalledWith("playlistDict:v2:user-1", expect.any(Object));
        expect(saveLocalItem).toHaveBeenCalledWith("lastPlaylistSync:v2:user-1", expect.any(Number));
    });

    it("drops stale writes when the request is aborted before persistence", async () => {
        const deferredPlaylist = deferred<Playlist>();
        const playlistPage = {
            items: [makeSimplifiedPlaylist("playlist-1", "snapshot-a")],
            next: null,
        } as any;
        const currentUserPlaylists = vi.fn(async () => playlistPage);
        const getPlaylist = vi.fn(async () => deferredPlaylist.promise);
        const getPlaylistItems = vi.fn();
        const client = makeClient({ currentUserPlaylists, getPlaylist, getPlaylistItems });
        const controller = new AbortController();

        const syncPromise = library.syncUserPlaylists(client, { state: "waiting" }, false, undefined, {
            identity: { userId: "user-1" },
            signal: controller.signal,
        });

        await Promise.resolve();
        controller.abort();
        deferredPlaylist.resolve(makePopulatedPlaylist("playlist-1", ["track-1"]));

        await expect(syncPromise).resolves.toBeUndefined();
        expect(saveLocalItem).not.toHaveBeenCalled();
    });

    it("uses per-user cache keys so another account does not read stale data", async () => {
        const userOneKeys = library.buildPlaylistCacheKeys({ userId: "user-1" });
        const userTwoKeys = library.buildPlaylistCacheKeys({ userId: "user-2" });
        storageState.set(userOneKeys.playlistDictKey, {
            tracks: { "track-1": ["playlist-1"] },
            playlists: {
                "playlist-1": makeSimplifiedPlaylist("playlist-1", "snapshot-a"),
            },
        });
        storageState.set(userOneKeys.lastSyncKey, Date.now());

        const playlistPage = {
            items: [makeSimplifiedPlaylist("playlist-2", "snapshot-b")],
            next: null,
        } as any;
        const currentUserPlaylists = vi.fn(async () => playlistPage);
        const getPlaylist = vi.fn(async () => makePopulatedPlaylist("playlist-2", ["track-2"]));
        const getPlaylistItems = vi.fn();
        const client = makeClient({ currentUserPlaylists, getPlaylist, getPlaylistItems });

        await library.syncUserPlaylists(client, { state: "waiting" }, false, undefined, {
            identity: { userId: "user-2" },
        });

        expect(loadLocalItem).toHaveBeenCalledWith(userTwoKeys.playlistDictKey);
        expect(loadLocalItem).not.toHaveBeenCalledWith(userOneKeys.playlistDictKey);
        expect(currentUserPlaylists).toHaveBeenCalledTimes(1);
    });

    it("applies playlist diff updates and keeps track mappings unique", async () => {
        const oldPlaylistDict = {
            tracks: {
                "track-1": ["playlist-old"],
                "track-2": ["playlist-delete"],
            },
            playlists: {
                "playlist-old": makeSimplifiedPlaylist("playlist-old", "snapshot-old"),
                "playlist-delete": makeSimplifiedPlaylist("playlist-delete", "snapshot-delete"),
            },
        };
        const playlists = [
            makeSimplifiedPlaylist("playlist-old", "snapshot-updated"),
            makeSimplifiedPlaylist("playlist-new", "snapshot-new"),
        ];

        const playlistMap = new Map<string, Playlist>([
            ["playlist-old", makePopulatedPlaylist("playlist-old", ["track-1", "track-1", "track-3"])],
            ["playlist-new", makePopulatedPlaylist("playlist-new", ["track-3"])],
        ]);
        const currentUserPlaylists = vi.fn();
        const getPlaylist = vi.fn(async (playlistId: string) => playlistMap.get(playlistId)!);
        const getPlaylistItems = vi.fn();
        const client = makeClient({ currentUserPlaylists, getPlaylist, getPlaylistItems });

        const updated = await library.updatePlaylistDict(client, playlists, oldPlaylistDict, undefined, {
            identity: { userId: "user-1" },
        });

        expect(updated.playlists["playlist-delete"]).toBeUndefined();
        expect(updated.playlists["playlist-old"]?.snapshot_id).toBe("snapshot-updated");
        expect(updated.playlists["playlist-new"]?.snapshot_id).toBe("snapshot-new");
        expect(updated.tracks["track-2"]).toBeUndefined();
        expect(updated.tracks["track-1"]).toEqual(["playlist-old"]);
        expect(updated.tracks["track-3"]).toEqual(["playlist-new", "playlist-old"]);
    });
});

function makeClient(implementation: {
    currentUserPlaylists?: (...args: unknown[]) => Promise<unknown>;
    getPlaylist?: (playlistId: string) => Promise<Playlist>;
    getPlaylistItems?: (...args: unknown[]) => Promise<unknown>;
}) {
    return {
        currentUser: {
            playlists: {
                playlists: implementation.currentUserPlaylists ?? vi.fn(async () => ({ items: [], next: null })),
            },
        },
        playlists: {
            getPlaylist: implementation.getPlaylist ?? vi.fn(async () => makePopulatedPlaylist("playlist-1", [])),
            getPlaylistItems: implementation.getPlaylistItems ?? vi.fn(async () => ({ items: [], next: null })),
        },
    } as any;
}

function makeSimplifiedPlaylist(id: string, snapshotId: string): SimplifiedPlaylist {
    return {
        id,
        name: `Playlist ${id}`,
        snapshot_id: snapshotId,
        owner: {
            id: `owner-${id}`,
            display_name: `Owner ${id}`,
        } as any,
    } as SimplifiedPlaylist;
}

function makePopulatedPlaylist(id: string, trackIds: string[]): Playlist {
    return {
        id,
        tracks: {
            items: trackIds.map((trackId) => ({
                track: { id: trackId } as any,
            })) as any,
            next: null,
        },
    } as Playlist;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });

    return { promise, resolve, reject };
}
