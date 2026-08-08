import { describe, it, expect } from 'vitest';
import { kindTint, clampScale, MIN_SCALE, MAX_SCALE } from './types';

/**
 * Regression guard for a real outage: a node stored with a non-numeric x/y made
 * fitView produce NaN bounds, clampScale passed the NaN straight through (
 * Math.min/max propagate it rather than clamping), and `transform: scale(NaN)`
 * was dropped wholesale by the browser — killing pan, zoom, drag and connection
 * lines simultaneously, with nothing in the console. Never let NaN escape here.
 */
describe('clampScale', () => {
  it('never returns a non-finite scale', () => {
    expect(clampScale(NaN)).toBe(1);
    expect(clampScale(Infinity)).toBe(1);
    expect(clampScale(-Infinity)).toBe(1);
    expect(clampScale(undefined as unknown as number)).toBe(1);
  });

  it('still clamps ordinary values to the allowed range', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(1)).toBe(1);
  });
});

/**
 * kindTint derives per-kind tint colors from KIND_META[kind].color at a named
 * alpha role, with urgent carrying a deliberate 1.2x intensity multiplier
 * (it's meant to read as the loudest kind). These are regression canaries
 * for that derivation — the two things most likely to silently rot are the
 * alpha rounding and the urgent multiplier.
 */
describe('kindTint', () => {
  it('reproduces urgent bg exactly (0.1 * 1.2 = 0.12)', () => {
    expect(kindTint('urgent', 'bg')).toBe('rgba(249, 115, 22, 0.12)');
  });

  it('reproduces urgent border exactly (0.5 * 1.2 = 0.6)', () => {
    expect(kindTint('urgent', 'border')).toBe('rgba(249, 115, 22, 0.6)');
  });

  it('rounds urgent glow off float drift (0.45 * 1.2 -> 0.54, not 0.5400000000000001)', () => {
    expect(kindTint('urgent', 'glow')).toBe('rgba(249, 115, 22, 0.54)');
  });

  it('leaves non-urgent kinds at their base alpha, unmultiplied', () => {
    expect(kindTint('idea', 'bg')).toBe('rgba(52, 211, 153, 0.1)');
    expect(kindTint('concern', 'bg')).toBe('rgba(167, 139, 250, 0.1)');
    expect(kindTint('task', 'bg')).toBe('rgba(96, 165, 250, 0.1)');
  });

  it('gives every kind five distinct tint alphas across its six roles', () => {
    // bgActive and ring intentionally share one alpha (0.22, "selection
    // emphasis") — so 6 roles collapse to 5 distinct rendered values, not 6.
    const roles = ['bg', 'bgActive', 'border', 'glow', 'glowSoft', 'ring'] as const;
    const values = roles.map((r) => kindTint('concern', r));
    expect(new Set(values).size).toBe(5);
    expect(kindTint('concern', 'bgActive')).toBe(kindTint('concern', 'ring'));
  });
});
