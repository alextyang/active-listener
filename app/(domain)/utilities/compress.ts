import LZString from 'lz-string';
import { DEBUG_COMPRESSION as LOG } from '../app/config';

const kbSize = (str: string) => (new Blob([str]).size * 0.001).toFixed(2) + 'KB';
export function compressString(input: string): string {
    const compressed = LZString.compress(input);
    if (LOG) console.log('[COMPRESSION] Compressed: ' + kbSize(input) + ' -> ' + kbSize(compressed));
    return compressed;
}

export function decompressString(input: string): string {
    const decompressed = LZString.decompress(input);
    if (LOG) console.log('[COMPRESSION] Decompressed: ' + kbSize(input) + ' -> ' + kbSize(decompressed));
    return decompressed;
}