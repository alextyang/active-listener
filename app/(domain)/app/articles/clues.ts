import { ContextClueObject } from "@/app/(domain)/app/context";
import { CompleteArticle } from "@/app/(domain)/app/types";
import { CLUE_TYPE_ARTICLE, DEBUG_CLUES } from "../config";

export function extractArticleContextClues(articles: CompleteArticle[]): ContextClueObject {
    const clues: ContextClueObject = {};

    articles.forEach((article) => {
        addClue(clues, article.title, article);
        addClue(clues, article.byline, article);
        addClue(clues, article.siteName, article);
    });

    if (DEBUG_CLUES) console.log('[CLUES] Extracted clues:', clues);

    return clues;

}

function addClue(clues: ContextClueObject, key?: string, value?: any) {
    if (!value || !key || clues[key]) return;
    clues[key] = { type: CLUE_TYPE_ARTICLE, value };
}