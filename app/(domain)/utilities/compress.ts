import LZString from 'lz-string';

export function compressString(input: string): string {
    return LZString.compress(input);
}

export function decompressString(input: string): string {
    return LZString.decompress(input);
}