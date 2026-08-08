import { describe, it, expect } from 'vitest';
import { hexToRgb, hexToRgbString, clampAlpha, rgba, hexToRgba } from './color';

describe('hexToRgb / hexToRgbString', () => {
  it('expands 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses 6-digit hex', () => {
    expect(hexToRgb('#f97316')).toEqual({ r: 249, g: 115, b: 22 });
  });

  it('tolerates a missing #', () => {
    expect(hexToRgb('34d399')).toEqual({ r: 52, g: 211, b: 153 });
  });

  it('formats as an "r, g, b" triple', () => {
    expect(hexToRgbString('#f97316')).toBe('249, 115, 22');
  });
});

describe('clampAlpha', () => {
  it('passes through an in-range value', () => {
    expect(clampAlpha(0.5)).toBe(0.5);
  });

  it('clamps above 1 down to 1', () => {
    expect(clampAlpha(1.4)).toBe(1);
  });

  it('clamps below 0 up to 0', () => {
    expect(clampAlpha(-0.2)).toBe(0);
  });

  it('rounds off float drift instead of leaking it (0.45 * 1.2 is 0.5399999999999999 in JS)', () => {
    expect(clampAlpha(0.45 * 1.2)).toBe(0.54);
  });
});

describe('rgba', () => {
  it('builds an rgba() string from a triple and alpha', () => {
    expect(rgba('1, 2, 3', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('clamps an out-of-range alpha', () => {
    expect(rgba('1, 2, 3', 1.5)).toBe('rgba(1, 2, 3, 1)');
  });
});

describe('hexToRgba', () => {
  it('expands a 3-digit hex and applies alpha', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('matches the urgent kind color at its base bg alpha', () => {
    expect(hexToRgba('#f97316', 0.12)).toBe('rgba(249, 115, 22, 0.12)');
  });
});
