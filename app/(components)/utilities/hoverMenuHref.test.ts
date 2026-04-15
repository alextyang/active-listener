import { describe, expect, it } from "vitest";
import { shouldUseNativeLink } from "./hoverMenuHref";

describe("shouldUseNativeLink", () => {
    it("uses anchors for external urls and custom schemes", () => {
        expect(shouldUseNativeLink("https://example.com/review")).toBe(true);
        expect(shouldUseNativeLink("spotify:track:123")).toBe(true);
    });

    it("keeps internal app paths on next/link", () => {
        expect(shouldUseNativeLink("/demo/track1")).toBe(false);
    });
});
