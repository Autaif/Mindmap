export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** "r, g, b" — feed straight into `rgba(var(--x), alpha)`. */
export function hexToRgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/** Clamp to 0..1 and round to 3dp — keeps derived alphas off values like 0.5400000000000001. */
export function clampAlpha(alpha: number): number {
  return Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
}

/** `rgba(r, g, b, a)` from an "r, g, b" triple (e.g. the output of `hexToRgbString`). */
export function rgba(rgbTriple: string, alpha: number): string {
  return `rgba(${rgbTriple}, ${clampAlpha(alpha)})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  return rgba(hexToRgbString(hex), alpha);
}
