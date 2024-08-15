import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export function findOpenGraphImage(html?: string): string | undefined {
    if (!html) return undefined;
    try {
        const ogImageTag = html.split('og:image')[1].split('content="')[1].split('"')[0];
        if (ogImageTag && new URL(ogImageTag))
            return ogImageTag;

    } catch (error) { }

    return undefined;
}

export function htmlToDocument(html: string): Document {
    const tempWindow = new JSDOM('html').window;
    const purify = DOMPurify(tempWindow);

    const sanitizedHtml = purify.sanitize(html);
    const window = new JSDOM(sanitizedHtml).window;

    const doc = window.document;

    return doc;
}