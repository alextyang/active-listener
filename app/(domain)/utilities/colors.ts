export function rgbaToStyleString(rgb?: number[]): string {
    if (!rgb) return '0, 0, 0, 0';
    return 'rgba(' + rgb.join(', ') + ')';
}

export function darkenRGB(rgb: number[], offset: number): number[] {
    return rgb.map((value) => Math.max(value - offset, 0));
}

export function lightenRGB(rgb: number[], offset: number): number[] {
    return rgb.map((value) => Math.min(value + offset, 255));
}

export function createGradientStyleString(c1: string, c2: string, angle: number, start: number, end: number): string {
    return `linear-gradient(${angle}deg, ${c1} ${start}%, ${c2} ${end}%)`;
}
