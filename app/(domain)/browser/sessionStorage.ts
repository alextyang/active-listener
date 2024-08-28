"use client";

import { compressString, decompressString } from '../utilities/compress';

export function hasSessionKey(key: string): boolean {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(key) !== null;
}

export function loadSessionItem<T>(key: string): T | undefined {
    if (typeof window === "undefined") console.error('[SESSIONSTORAGE] Session storage not available.');
    if (!window.sessionStorage) return undefined;

    const compressedValue = window.sessionStorage.getItem(key);
    if (!compressedValue)
        return undefined;

    const value = decompressString(compressedValue);

    try {
        return JSON.parse(value) as T;

    } catch (error) {
        console.error('[SESSIONSTORAGE] Error parsing stored \'' + key + '\' value:', error);
        return undefined;
    }
}

export function saveSessionItem(key: string, value: any): void {
    if (typeof window === "undefined") return console.error('[SESSIONSTORAGE] Session storage not available.');
    const compressedValue = compressString(JSON.stringify(value));
    window.sessionStorage.setItem(key, compressedValue);
}