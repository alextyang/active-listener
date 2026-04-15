import { describe, expect, it, vi } from "vitest";
import { addToPlaybackQueue, togglePlayback } from "./player";

describe("addToPlaybackQueue", () => {
    it("returns success when the Spotify SDK queue call succeeds", async () => {
        const addItemToPlaybackQueue = vi.fn(async () => undefined);

        await expect(addToPlaybackQueue({
            player: {
                addItemToPlaybackQueue,
            },
        } as never, "spotify:track:123")).resolves.toEqual({ ok: true });
        expect(addItemToPlaybackQueue).toHaveBeenCalledWith("spotify:track:123");
    });

    it("normalizes Spotify queue response parse errors as success", async () => {
        const addItemToPlaybackQueue = vi.fn(async () => {
            throw new SyntaxError("Unable to parse JSON string");
        });

        await expect(addToPlaybackQueue({
            player: {
                addItemToPlaybackQueue,
            },
        } as never, "spotify:track:123")).resolves.toEqual({ ok: true });
    });

    it("returns a failure object for other queue errors", async () => {
        const addItemToPlaybackQueue = vi.fn(async () => {
            throw new Error("No active device");
        });

        await expect(addToPlaybackQueue({
            player: {
                addItemToPlaybackQueue,
            },
        } as never, "spotify:track:123")).resolves.toEqual({
            ok: false,
            error: "No active device",
        });
    });
});

describe("togglePlayback", () => {
    it("normalizes parse errors from current-track playback commands", async () => {
        vi.useFakeTimers();
        const startResumePlayback = vi.fn(async () => {
            throw new SyntaxError("JSON Parse error: Unable to parse JSON string");
        });
        const handlePlaybackSync = vi.fn(async () => undefined);
        const setPlaybackState = vi.fn();

        await expect(togglePlayback({
            player: {
                startResumePlayback,
            },
        } as never, {
            is_playing: false,
            device: { id: "device-1" },
            timestamp: Date.now(),
        } as never, handlePlaybackSync, setPlaybackState)).resolves.toBeUndefined();

        expect(startResumePlayback).toHaveBeenCalledWith("device-1");
        expect(setPlaybackState).toHaveBeenCalled();
        await vi.runAllTimersAsync();
        expect(handlePlaybackSync).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("normalizes parse errors when pausing the current track", async () => {
        vi.useFakeTimers();
        const pausePlayback = vi.fn(async () => {
            throw new Error("Unable to parse JSON string");
        });
        const handlePlaybackSync = vi.fn(async () => undefined);
        const setPlaybackState = vi.fn();

        await expect(togglePlayback({
            player: {
                pausePlayback,
            },
        } as never, {
            is_playing: true,
            device: { id: "device-1" },
            progress_ms: 12_345,
            timestamp: Date.now(),
        } as never, handlePlaybackSync, setPlaybackState)).resolves.toBeUndefined();

        expect(pausePlayback).toHaveBeenCalledWith("device-1");
        expect(setPlaybackState).toHaveBeenCalled();
        await vi.runAllTimersAsync();
        expect(handlePlaybackSync).toHaveBeenCalled();
        vi.useRealTimers();
    });
});
