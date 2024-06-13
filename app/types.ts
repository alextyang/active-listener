export type Article = {
    link: string,
    title: string,
    content?: string,
    siteName?: string,
    publishedTime?: string,
    byline?: string,
    image?: string,
    colorExtracts?: string[],
    excerpt?: string,
    type?: string,
    relevance?: string,
} | undefined;