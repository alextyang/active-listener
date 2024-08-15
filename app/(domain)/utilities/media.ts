import Vibrant from "node-vibrant";
import { CompleteArticle } from "../app/types";
import { ARTICLE_GRADIENT, DEFAULT_ARTICLE_GRADIENT } from "../app/config";

export async function extractArticleGradient(src: string | undefined) {
    const angle = Math.floor(Math.random() * 360);
    const palette = await extractPaletteFromImage(src);

    if (!src || !palette) return `linear-gradient(${angle}deg, ${DEFAULT_ARTICLE_GRADIENT[0]} 0%, ${DEFAULT_ARTICLE_GRADIENT[0]} 100%)`;

    const color1 = palette[ARTICLE_GRADIENT[0]]?.getHex() ?? DEFAULT_ARTICLE_GRADIENT[0];
    const color2 = palette[ARTICLE_GRADIENT[1]]?.getHex() ?? DEFAULT_ARTICLE_GRADIENT[1];
    return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

export async function extractPaletteFromImage(src?: string) {
    if (!src) return undefined;
    try {
        return await Vibrant.from(src).getPalette();
    } catch (error) { }
    return undefined;
}