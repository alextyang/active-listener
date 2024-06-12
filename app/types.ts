export type Article = {
    link: string,
    title: string,
    content?: string,
    siteName?: string,
    publishedTime?: string,
    byline?: string
} | undefined;