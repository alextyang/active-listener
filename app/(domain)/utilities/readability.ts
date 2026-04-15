import { Readability } from "@mozilla/readability";
import { ReadabilityResult } from "../app/types";

export function parseReadableArticle(doc: Document): ReadabilityResult {
    const reader = new Readability(doc, { debug: false });
    const article = reader.parse();

    if (!article?.title || !article?.content || !article?.textContent || article.length == null || !article?.excerpt)
        return undefined;

    return {
        title: article.title,
        content: article.content,
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt,
        byline: article.byline ?? "",
        dir: article.dir ?? "",
        siteName: article.siteName ?? "",
        lang: article.lang ?? "",
        publishedTime: article.publishedTime ?? "",
    };
}
