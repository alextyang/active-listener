"use server";

import { kv } from '@vercel/kv';
import { compressString, decompressString } from '../utilities/compress';

export async function loadItem<T>(key: string): Promise<T | undefined> {
    let compressedValue;

    try {
        compressedValue = await kv.get<{ item: string }>(key);
    } catch (error) {
        console.error('[KV-DB] Error getting \'' + key + '\' value:', error);
    }

    if (!compressedValue)
        return undefined;

    const value = decompressString(compressedValue.item);

    try {
        return JSON.parse(value) as T;

    } catch (error) {
        console.error('[KV-DB] Error parsing stored \'' + key + '\' value:', error);
        return undefined;
    }
}

export async function saveItem<T>(key: string, value: T) {
    const compressedValue = compressString(JSON.stringify(value));

    try {
        await kv.set<string>(key, JSON.stringify({ item: compressedValue }));
    }
    catch (e) {
        console.error('[KV-DB] Error setting \'' + key + '\' value:', e);
    }

    console.log('[KV-DB] Saved \'' + key + '\' value:', value);

}