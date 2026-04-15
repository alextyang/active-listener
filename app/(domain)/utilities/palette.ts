import sharp from "sharp";
import { BasicPipeline, Vibrant } from "@vibrant/core";
import { DefaultGenerator } from "@vibrant/generator-default";
import { ImageBase, ImageData, ImageSource } from "@vibrant/image";
import { MMCQ } from "@vibrant/quantizer-mmcq";
import { TrackPalette, TrackPaletteSwatch } from "../app/types";

const VIBRANT_DEFAULT_QUALITY = 5;
const ORIGINAL_SWATCH_NAMES = ["Vibrant", "Muted", "DarkVibrant", "DarkMuted", "LightVibrant", "LightMuted"] as const;

const pipeline = new BasicPipeline();
pipeline.generator.register("default", DefaultGenerator);
pipeline.quantizer.register("mmcq", MMCQ);
Vibrant["use"](pipeline);

export async function extractPaletteFromImage(src?: string): Promise<TrackPalette | undefined> {
    if (!src)
        return undefined;

    try {
        const response = await fetch(src, { cache: "force-cache" });
        if (!response.ok)
            return undefined;

        const original = Buffer.from(await response.arrayBuffer());
        const prepared = await downsampleForVibrant(original);
        const palette = await Vibrant.from(prepared)
            .useImageClass(SharpVibrantImage)
            .useQuantizer("mmcq")
            .quality(1)
            .getPalette();

        return serializePalette(palette as Record<string, { rgb: number[]; hex: string } | null>);
    } catch {
        return undefined;
    }
}

class SharpVibrantImage extends ImageBase {
    private imageData: ImageData | undefined;

    async load(image: ImageSource): Promise<ImageBase> {
        if (!(image instanceof Buffer))
            throw new Error("SharpVibrantImage expects a preloaded Buffer source.");

        const { data, info } = await sharp(image)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        this.imageData = {
            data,
            width: info.width,
            height: info.height,
        };

        return this;
    }

    clear(): void {
        this.imageData = undefined;
    }

    update(imageData: ImageData): void {
        this.imageData = imageData;
    }

    getWidth(): number {
        return this.requireImageData().width;
    }

    getHeight(): number {
        return this.requireImageData().height;
    }

    resize(): void {
        // The source image is pre-scaled before it reaches Vibrant.
    }

    getPixelCount(): number {
        const imageData = this.requireImageData();
        return imageData.width * imageData.height;
    }

    getImageData(): ImageData {
        return this.requireImageData();
    }

    remove(): void {
        this.imageData = undefined;
    }

    private requireImageData(): ImageData {
        if (!this.imageData)
            throw new Error("Image not loaded");
        return this.imageData;
    }
}

async function downsampleForVibrant(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width <= 0 || height <= 0)
        return buffer;

    const targetWidth = Math.max(1, Math.round(width / VIBRANT_DEFAULT_QUALITY));
    const targetHeight = Math.max(1, Math.round(height / VIBRANT_DEFAULT_QUALITY));

    if (targetWidth === width && targetHeight === height)
        return buffer;

    return sharp(buffer)
        .resize(targetWidth, targetHeight)
        .png()
        .toBuffer();
}

function serializePalette(palette?: Record<string, { rgb: number[]; hex: string } | null>): TrackPalette | undefined {
    if (!palette)
        return undefined;

    const serialized = Object.fromEntries(
        ORIGINAL_SWATCH_NAMES.map((name) => {
            const swatch = palette[name];
            if (!swatch?.rgb)
                return [name, undefined];

            return [name, toSwatch(swatch.rgb, swatch.hex)];
        }),
    );

    return Object.values(serialized).some(Boolean) ? serialized : undefined;
}

function toSwatch(rgb: number[], hex?: string): TrackPaletteSwatch {
    return {
        rgb: rgb.map((value) => Math.round(value)),
        hex,
    };
}
