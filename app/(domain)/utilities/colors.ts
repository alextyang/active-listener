import Vibrant from "node-vibrant";
import { CompleteArticle } from "../app/types";
import { ARTICLE_GRADIENT } from "../app/config";

export async function extractArticleGradient(src: string | undefined) {
    const angle = Math.floor(Math.random() * 360);
    const palette = await extractPaletteFromImage(src);

    if (!src || !palette || !palette[ARTICLE_GRADIENT[0]] || !palette[ARTICLE_GRADIENT[1]]) return undefined;

    const color1 = palette[ARTICLE_GRADIENT[0]]?.getHex();
    const color2 = palette[ARTICLE_GRADIENT[1]]?.getHex();
    if (!color1 || !color2) return undefined;

    return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

export async function extractPaletteFromImage(src?: string) {
    if (!src) return undefined;
    try {
        return await Vibrant.from(src).getPalette();
    } catch (error) { }
    return undefined;
}

export function rgbaToStyleString(rgb?: number[]): string {
    if (!rgb) return '0, 0, 0, 0';
    return 'rgba(' + rgb.join(', ') + ')';
}

export function darkenRGB(rgb: number[], offset: number): number[] {
    return rgb.map((value) => Math.max(value - offset, 0));
}

export function lightenRGB(rgb: number[], offset: number): number[] {
    return rgb.map((value) => Math.min(value + offset, 255));
}

export function createGradientStyleString(c1: string, c2: string, angle: number, start: number, end: number): string {
    return `linear-gradient(${angle}deg, ${c1} ${start}%, ${c2} ${end}%)`;
}