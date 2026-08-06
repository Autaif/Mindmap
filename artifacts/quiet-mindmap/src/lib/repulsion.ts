export interface RepelPoint {
  id: string;
  x: number;
  y: number;
}

export interface PushOffset {
  dx: number;
  dy: number;
}

export const ZERO_PUSH: PushOffset = { dx: 0, dy: 0 };

/** How close (world units) an item needs to be to the dragged item before it starts sliding away. */
const PUSH_RADIUS = 220;
/** Furthest an item ever gets nudged, at zero distance from the dragged item. */
const MAX_PUSH = 104;
/**
 * Shapes the falloff. Below 1 the push stays near full strength across most of
 * the radius and drops off sharply only at the edge, which reads as items
 * actively getting out of the way. A linear falloff (1.0) feels limp by
 * comparison — most neighbours barely move until you are almost on top of them.
 */
const FALLOFF = 0.6;

/**
 * Purely presentational: how far each of `items` should visually nudge away
 * from the item currently at `source`. Never written back to node/orb state —
 * callers add the offset only at render time, so it springs back on its own
 * once the drag ends or moves away (via a CSS transition on the caller side).
 */
export function computePushOffsets(source: RepelPoint | null, items: RepelPoint[]): Map<string, PushOffset> {
  const offsets = new Map<string, PushOffset>();
  if (!source) return offsets;

  for (const item of items) {
    if (item.id === source.id) continue;
    const dx = item.x - source.x;
    const dy = item.y - source.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= PUSH_RADIUS || dist === 0) continue;
    const strength = Math.pow(1 - dist / PUSH_RADIUS, FALLOFF);
    const push = strength * MAX_PUSH;
    offsets.set(item.id, { dx: (dx / dist) * push, dy: (dy / dist) * push });
  }

  return offsets;
}
