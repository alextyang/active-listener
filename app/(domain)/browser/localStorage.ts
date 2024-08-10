"use client";

import { compressString, decompressString } from '../utilities/compress';

export function hasLocalKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
}

export function loadLocalItem<T>(key: string): T | undefined {
    const compressedValue = localStorage.getItem(key);
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
    const compressedValue = compressString(JSON.stringify(value));
    localStorage.setItem(key, compressedValue);
}