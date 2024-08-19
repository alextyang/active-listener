"use client";

import { compressString, decompressString } from '../utilities/compress';

export function hasLocalKey(key: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) !== null;
}

export function loadLocalItem<T>(key: string): T | undefined {
    if (typeof window === "undefined") console.error('[LOCALSTORAGE] Local storage not available.');
    if (!window.localStorage) return undefined;

    const compressedValue = window.localStorage.getItem(key);
    if (!compressedValue)
        return undefined;

    const value = decompressString(compressedValue);

    try {
        return JSON.parse(value) as T;

    } catch (error) {
        console.error('[LOCALSTORAGE] Error parsing stored \'' + key + '\' value:', error);
        return undefined;
    }
}

export function saveLocalItem(key: string, value: any): void {
    if (typeof window === "undefined") return console.error('[LOCALSTORAGE] Local storage not available.');
    const compressedValue = compressString(JSON.stringify(value));
    window.localStorage.setItem(key, compressedValue);
}