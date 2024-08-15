export type ArticleSearchResult = {
    title: string,
    link: string,
    relevance?: string,
    type?: string,
} | undefined;

export type ReadabilityResult = {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
} | undefined;

export type CompleteArticle = {
    link: string,
    title: string,
    content: string,
    siteName: string,
    publishedTime: string,
    byline: string,
    image?: string,
    gradient: string,
    excerpt: string,
    type: string,
    relevance: string,
    wordCount: number
};