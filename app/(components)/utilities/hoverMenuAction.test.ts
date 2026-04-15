import { describe, expect, it, vi } from "vitest";
import { runHoverMenuAction } from "./hoverMenuAction";

describe("runHoverMenuAction", () => {
    it("catches rejected async click handlers and logs them instead of leaking raw errors", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

        runHoverMenuAction(async () => {
            throw new Error("JSON Parse error: Unable to parse JSON string");
        });
        await Promise.resolve();

        expect(consoleError).toHaveBeenCalledWith(
            "[HOVER-MENU] Action failed:",
            expect.objectContaining({
                message: "JSON Parse error: Unable to parse JSON string",
            }),
        );
    });

    it("ignores empty handlers", () => {
        expect(runHoverMenuAction()).toBeUndefined();
    });
});
