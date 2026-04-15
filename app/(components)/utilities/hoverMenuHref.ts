export function shouldUseNativeLink(href: string): boolean {
    return !href.startsWith("/");
}
