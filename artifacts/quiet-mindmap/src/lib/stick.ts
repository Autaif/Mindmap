import type { MindNode } from '../types';

/**
 * Dragging one entry onto another sticks them together side by side, and they
 * move as a unit from then on. Useful for grouping the three things about one
 * person, or one meeting, without making them sub-items of each other — the
 * parent/child relationship means something different and shows up in the
 * connection lines.
 *
 * Stored the same way as orb assignments: local-only, `follower id → anchor id`.
 * Nothing here touches the sync payload.
 */

const stickKey = (storeId: string) => `quiet-mindmap-stuck:${storeId}`;

/** Nominal bubble width. Widths vary a little by kind and state; one value
 *  keeps a stuck row evenly spaced instead of ragged. */
export const SLOT_WIDTH = 184;
/** How close a drop has to land before it counts as "onto" another entry. */
export const SNAP_RADIUS = 120;
/** Drag a stuck entry this far from its row and it comes loose again. */
export const RELEASE_DISTANCE = 150;

export type StickMap = Record<string, string>;

export function loadSticks(storeId: string): StickMap {
  try {
    const raw = localStorage.getItem(stickKey(storeId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as StickMap) : {};
  } catch {
    return {};
  }
}

export function saveSticks(storeId: string, sticks: StickMap) {
  localStorage.setItem(stickKey(storeId), JSON.stringify(sticks));
}

/** Everything stuck to `id`, transitively, so a whole row travels together. */
export function followersOf(sticks: StickMap, id: string): string[] {
  const out: string[] = [];
  const queue = [id];
  const seen = new Set<string>([id]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [follower, anchor] of Object.entries(sticks)) {
      // `seen` also guards against a cycle written by an older build looping here.
      if (anchor === current && !seen.has(follower)) {
        seen.add(follower);
        out.push(follower);
        queue.push(follower);
      }
    }
  }
  return out;
}

/** The entry at the head of a stuck row — the one everything else hangs off. */
export function rootAnchorOf(sticks: StickMap, id: string): string {
  let current = id;
  const seen = new Set<string>([id]);
  while (sticks[current] && !seen.has(sticks[current])) {
    current = sticks[current];
    seen.add(current);
  }
  return current;
}

/**
 * Where a newly stuck entry should sit: flush beside its anchor, on the side
 * it was dropped, past anything already stuck on that side.
 */
export function slotPosition(
  anchor: MindNode,
  droppedX: number,
  occupiedOffsets: number[],
): { x: number; y: number } {
  const side = droppedX >= anchor.x ? 1 : -1;
  let slot = 1;
  // Step outward until an unused slot is found, so a third entry lands beyond
  // the second rather than on top of it.
  while (occupiedOffsets.includes(side * slot * SLOT_WIDTH)) slot += 1;
  return { x: Math.round(anchor.x + side * slot * SLOT_WIDTH), y: anchor.y };
}

/**
 * The entry a drop should stick to: the nearest one within snapping distance,
 * ignoring the dragged entry's own row so a group can't stick to itself.
 */
export function findStickTarget(
  draggedId: string,
  droppedAt: { x: number; y: number },
  nodes: MindNode[],
  sticks: StickMap,
): MindNode | null {
  const ownRow = new Set([draggedId, ...followersOf(sticks, draggedId)]);
  let best: MindNode | null = null;
  let bestDist = SNAP_RADIUS;

  for (const node of nodes) {
    if (ownRow.has(node.id)) continue;
    const dist = Math.hypot(node.x - droppedAt.x, node.y - droppedAt.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }
  return best;
}
