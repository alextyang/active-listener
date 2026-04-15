import { describe, expect, it } from "vitest";
import { findOpenGraphImage, htmlToDocument } from "./document";

describe("document utilities", () => {
    it("sanitizes dangerous markup before creating a document", () => {
        const document = htmlToDocument(`
            <html>
                <body>
                    <script>alert("xss")</script>
                    <img src="x" onerror="alert('xss')" />
                    <a href="javascript:alert('xss')">Unsafe</a>
                    <p>Safe content</p>
                </body>
            </html>
        `);

        expect(document.querySelector("script")).toBeNull();
        expect(document.querySelector("img")?.getAttribute("onerror")).toBeNull();
        expect(document.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
        expect(document.body.textContent).toContain("Safe content");
    });

    it("extracts an og:image url from sanitized markup", () => {
        const imageUrl = findOpenGraphImage(`
            <html>
                <head>
                    <meta property="og:image" content="https://images.example.com/cover.jpg" />
                </head>
            </html>
        `);

        expect(imageUrl).toBe("https://images.example.com/cover.jpg");
    });
});
