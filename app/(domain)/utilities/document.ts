import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export function findOpenGraphImage(html?: string): string | undefined {
    if (!html) return undefined;

    try {
        const document = new JSDOM(html).window.document;
        const content = document
            .querySelector('meta[property="og:image"], meta[name="og:image"]')
            ?.getAttribute("content")
            ?.trim();
        if (!content)
            return undefined;

        return new URL(content).toString();
    } catch {
        return undefined;
    }

}

export function htmlToDocument(html: string): Document {
    const tempWindow = new JSDOM("").window;
    const purify = DOMPurify(tempWindow);

    const sanitizedHtml = purify.sanitize(html);
    const window = new JSDOM(sanitizedHtml).window;

    const doc = window.document;

    return doc;
}
