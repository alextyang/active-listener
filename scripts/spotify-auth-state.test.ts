import { describe, expect, it } from "vitest";
import { findKeychainPayload, isMissingKeychainItem, normalizeStoredAuthStatePayload } from "./spotify-auth-state.mjs";

describe("spotify-auth-state keychain handling", () => {
    it("treats macOS security exit status 44 as a missing keychain item", () => {
        expect(isMissingKeychainItem({ status: 44 })).toBe(true);
        expect(isMissingKeychainItem({ code: 44 })).toBe(true);
        expect(isMissingKeychainItem({ message: "Error: 0x0000002C 44 unknown error 44=2c" })).toBe(true);
    });

    it("treats explicit keychain not found output as a missing item", () => {
        expect(isMissingKeychainItem({ stderr: "The specified item could not be found in the keychain." })).toBe(true);
    });

    it("does not swallow unrelated keychain failures", () => {
        expect(isMissingKeychainItem({ status: 1, message: "permission denied" })).toBe(false);
    });

    it("falls back to file storage when the keychain session is absent", () => {
        const payload = findKeychainPayload("service", "account", {
            macOsKeychain: true,
            execFile() {
                throw Object.assign(new Error("missing"), { status: 44 });
            },
        });

        expect(payload).toBeUndefined();
    });

    it("decodes hex-encoded auth state payloads returned by the macOS keychain", () => {
        const jsonPayload = JSON.stringify({
            cookies: [],
            origins: [
                {
                    origin: "http://127.0.0.1:3000",
                    localStorage: [
                        {
                            name: "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token",
                            value: "{\"access_token\":\"token\"}",
                        },
                    ],
                },
            ],
        });

        expect(normalizeStoredAuthStatePayload(Buffer.from(jsonPayload, "utf8").toString("hex"))).toBe(jsonPayload);
    });
});
