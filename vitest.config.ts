import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    test: {
        environment: "node",
        coverage: {
            reporter: ["text", "lcov"],
        },
        exclude: ["node_modules", ".next", "e2e/**", "playwright.config.ts"],
    },
});
