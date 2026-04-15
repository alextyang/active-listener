import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPaletteFromImage } from "./palette";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("extractPaletteFromImage", () => {
    it("derives the original vibrant swatch set from remote cover art", async () => {
        const image = await sharp({
            create: {
                width: 20,
                height: 20,
                channels: 3,
                background: { r: 32, g: 96, b: 192 },
            },
        }).png().toBuffer();

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(image, { status: 200 })));

        const palette = await extractPaletteFromImage("https://images.example.com/cover.png");

        expect(Object.keys(palette ?? {}).sort()).toEqual([
            "DarkMuted",
            "DarkVibrant",
            "LightMuted",
            "LightVibrant",
            "Muted",
            "Vibrant",
        ]);
        expect(palette).not.toHaveProperty("Dominant");
        expect(palette?.Muted?.rgb?.[2]).toBeGreaterThan(palette?.Muted?.rgb?.[0] ?? 0);
        expect(palette?.LightVibrant?.hex).toMatch(/^#/);
    });

    it("returns undefined when the image request fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));

        await expect(extractPaletteFromImage("https://images.example.com/missing.png")).resolves.toBeUndefined();
    });
});
