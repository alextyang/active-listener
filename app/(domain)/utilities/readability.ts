import { Readability } from "@mozilla/readability";
import { ReadabilityResult } from "../app/types";

export function parseReadableArticle(doc: Document): ReadabilityResult {
    const reader = new Readability(doc, { debug: false });
    const article = reader.parse();

    return article ?? undefined;
}