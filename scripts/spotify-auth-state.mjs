#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_AUTH_STATE_PATH = path.join(process.cwd(), ".playwright", "auth", "spotify-live.json");
const DEFAULT_KEYCHAIN_SERVICE = "active-listener-playwright";
const DEFAULT_KEYCHAIN_ACCOUNT = "spotify-live-auth";
const EMPTY_STORAGE_STATE = JSON.stringify({ cookies: [], origins: [] });

if (isExecutedAsScript())
    main();

export function main() {
    const [command = "help", ...argv] = process.argv.slice(2);
    const options = parseOptions(argv);

    if (command === "help" || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    const authStatePath = path.resolve(options.path ?? process.env.LIVE_SPOTIFY_STORAGE_STATE ?? DEFAULT_AUTH_STATE_PATH);
    const storageMode = resolveStorageMode(options.storage ?? process.env.LIVE_SPOTIFY_AUTH_STORAGE);
    const keychainService = options.service ?? process.env.LIVE_SPOTIFY_KEYCHAIN_SERVICE ?? DEFAULT_KEYCHAIN_SERVICE;
    const keychainAccount = options.account ?? process.env.LIVE_SPOTIFY_KEYCHAIN_ACCOUNT ?? DEFAULT_KEYCHAIN_ACCOUNT;

    if (command === "restore") {
        restoreAuthState(authStatePath, storageMode, keychainService, keychainAccount);
        return;
    }

    if (command === "save") {
        saveAuthState(authStatePath, storageMode, keychainService, keychainAccount);
        return;
    }

    if (command === "clear") {
        clearAuthState(authStatePath, storageMode, keychainService, keychainAccount);
        return;
    }

    throw new Error(`Unknown command: ${command}`);
}

export function restoreAuthState(authStatePath, storageMode, keychainService, keychainAccount) {
    ensureAuthStateFileExists(authStatePath);

    if (!usesKeychain(storageMode)) {
        console.log(`[auth-state] using file storage only: ${authStatePath}`);
        return;
    }

    const payload = findKeychainPayload(keychainService, keychainAccount);
    if (!payload) {
        console.log(`[auth-state] no macOS keychain session found for ${keychainService}/${keychainAccount}; using local file ${authStatePath}`);
        return;
    }

    writeValidatedAuthState(authStatePath, payload);
    console.log(`[auth-state] restored live Spotify auth state from macOS keychain to ${authStatePath}`);
}

export function saveAuthState(authStatePath, storageMode, keychainService, keychainAccount) {
    ensureAuthStateFileExists(authStatePath);

    if (!usesKeychain(storageMode)) {
        console.log(`[auth-state] kept live Spotify auth state in ${authStatePath}`);
        return;
    }

    const payload = readValidatedAuthState(authStatePath);
    execFileSync("security", [
        "add-generic-password",
        "-U",
        "-s",
        keychainService,
        "-a",
        keychainAccount,
        "-w",
        payload,
    ], {
        stdio: "ignore",
    });
    console.log(`[auth-state] saved live Spotify auth state to macOS keychain (${keychainService}/${keychainAccount})`);
}

export function clearAuthState(authStatePath, storageMode, keychainService, keychainAccount) {
    if (existsSync(authStatePath)) {
        rmSync(authStatePath, { force: true });
        console.log(`[auth-state] removed ${authStatePath}`);
    }

    if (!usesKeychain(storageMode))
        return;

    try {
        execFileSync("security", [
            "delete-generic-password",
            "-s",
            keychainService,
            "-a",
            keychainAccount,
        ], {
            stdio: "ignore",
        });
        console.log(`[auth-state] removed macOS keychain session ${keychainService}/${keychainAccount}`);
    } catch (error) {
        if (!isMissingKeychainItem(error))
            throw error;
    }
}

export function ensureAuthStateFileExists(authStatePath) {
    mkdirSync(path.dirname(authStatePath), { recursive: true });
    if (!existsSync(authStatePath))
        writeFileSync(authStatePath, EMPTY_STORAGE_STATE);
}

export function readValidatedAuthState(authStatePath) {
    const payload = readFileSync(authStatePath, "utf8").trim() || EMPTY_STORAGE_STATE;
    const normalizedPayload = normalizeStoredAuthStatePayload(payload);
    JSON.parse(normalizedPayload);
    return normalizedPayload;
}

export function writeValidatedAuthState(authStatePath, payload) {
    const normalizedPayload = normalizeStoredAuthStatePayload(payload);
    JSON.parse(normalizedPayload);
    mkdirSync(path.dirname(authStatePath), { recursive: true });
    writeFileSync(authStatePath, normalizedPayload);
}

export function findKeychainPayload(keychainService, keychainAccount, options = {}) {
    const execFile = options.execFile ?? execFileSync;
    const macOsKeychain = options.macOsKeychain ?? usesMacOsKeychain();

    if (!macOsKeychain)
        return undefined;

    try {
        return execFile("security", [
            "find-generic-password",
            "-w",
            "-s",
            keychainService,
            "-a",
            keychainAccount,
        ], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    } catch (error) {
        if (isMissingKeychainItem(error))
            return undefined;
        throw error;
    }
}

export function resolveStorageMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "file" || normalized === "keychain" || normalized === "both")
        return normalized;

    return usesMacOsKeychain() ? "both" : "file";
}

export function usesKeychain(storageMode) {
    return usesMacOsKeychain() && (storageMode === "keychain" || storageMode === "both");
}

export function usesMacOsKeychain() {
    return process.platform === "darwin";
}

export function isMissingKeychainItem(error) {
    const status = normalizeKeychainExitStatus(error);
    if (status === 44)
        return true;

    const message = extractKeychainErrorText(error);
    return /could not be found|item could not be found|unknown error 44|0x0000002c/i.test(message);
}

export function parseOptions(argv) {
    const options = {};

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        const next = argv[index + 1];

        if (token === "--path") {
            options.path = next;
            index += 1;
            continue;
        }

        if (token === "--storage") {
            options.storage = next;
            index += 1;
            continue;
        }

        if (token === "--service") {
            options.service = next;
            index += 1;
            continue;
        }

        if (token === "--account") {
            options.account = next;
            index += 1;
            continue;
        }
    }

    return options;
}

export function printHelp() {
    console.log(`
Usage:
  node scripts/spotify-auth-state.mjs restore [--path <file>] [--storage file|keychain|both]
  node scripts/spotify-auth-state.mjs save [--path <file>] [--storage file|keychain|both]
  node scripts/spotify-auth-state.mjs clear [--path <file>] [--storage file|keychain|both]

Defaults:
  auth state path: ${DEFAULT_AUTH_STATE_PATH}
  storage mode: macOS => both, other platforms => file
  keychain service/account: ${DEFAULT_KEYCHAIN_SERVICE} / ${DEFAULT_KEYCHAIN_ACCOUNT}
`);
}

export function normalizeStoredAuthStatePayload(payload) {
    const normalizedPayload = String(payload ?? "").trim();
    if (!normalizedPayload)
        return EMPTY_STORAGE_STATE;

    if (looksLikeJsonPayload(normalizedPayload))
        return normalizedPayload;

    if (looksLikeHexPayload(normalizedPayload)) {
        const decodedPayload = Buffer.from(normalizedPayload, "hex").toString("utf8").trim();
        if (looksLikeJsonPayload(decodedPayload))
            return decodedPayload;
    }

    return normalizedPayload;
}

function isExecutedAsScript() {
    const entryPath = process.argv[1];
    if (!entryPath)
        return false;

    return import.meta.url === pathToFileURL(path.resolve(entryPath)).href;
}

function normalizeKeychainExitStatus(error) {
    const rawStatus = error?.status ?? error?.code;
    const status = Number.parseInt(String(rawStatus), 10);
    return Number.isFinite(status) ? status : undefined;
}

function extractKeychainErrorText(error) {
    const parts = [
        error?.message,
        stringifyKeychainOutput(error?.stderr),
    ];

    if (Array.isArray(error?.output))
        parts.push(...error.output.map((chunk) => stringifyKeychainOutput(chunk)));

    return parts.filter(Boolean).join(" ");
}

function stringifyKeychainOutput(value) {
    if (typeof value === "string")
        return value;

    if (value && typeof value === "object" && "toString" in value)
        return value.toString();

    return "";
}

function looksLikeJsonPayload(value) {
    return value.startsWith("{") || value.startsWith("[");
}

function looksLikeHexPayload(value) {
    return value.length >= 2 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}
