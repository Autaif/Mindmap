import type { Attachment, MindNode } from '../types';

/**
 * Items shared between two people.
 *
 * The important property, and the reason this is not just "copy it to their
 * map": a shared item is **one record both people read**. When the director
 * marks it handled, the assistant sees it handled — there is no second copy to
 * drift out of step.
 *
 * What differs per person is only *where it sits*: each map is arranged by its
 * owner, so position is stored per person rather than on the item.
 *
 * Stage 0 keeps these records in localStorage, which two windows of the same
 * browser genuinely share, so the model is real rather than mimed. Stage 1
 * swaps this file's load/save for Supabase; the shape is chosen to survive that
 * move unchanged — `positions` becomes a `node_positions` table, and everything
 * else becomes columns.
 */

const SHARE_KEY = 'quiet-mindmap-shared';
const CHANNEL_NAME = 'quiet-mindmap-share';

/** Content of a shared item, minus the geometry that differs per person. */
export type SharedContent = Omit<MindNode, 'x' | 'y'>;

export interface SharedRecord {
  id: string;
  /** Who created it. */
  ownerId: string;
  /** Who it was sent to. */
  sharedWith: string;
  content: SharedContent;
  /** storeId → that person's position for this item on their own map. */
  positions: Record<string, { x: number; y: number }>;
  /**
   * Pictures and files travel with the item, so a concern arrives with its
   * evidence attached rather than as bare text.
   *
   * The metadata is carried here; the bytes are not. On one machine that is
   * enough — image blobs live in a single per-origin IndexedDB keyed by
   * attachment id, so the recipient reads the very same bytes, and seeded
   * pictures are files served by the app. Across two devices the bytes will
   * need real file storage; that is the Supabase Storage step.
   */
  attachments: Attachment[];
}

export type SharedMap = Record<string, SharedRecord>;

export function loadShared(): SharedMap {
  try {
    const raw = localStorage.getItem(SHARE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as SharedMap) : {};
  } catch {
    return {};
  }
}

export function saveShared(map: SharedMap) {
  localStorage.setItem(SHARE_KEY, JSON.stringify(map));
  announce();
}

/** Records this person can see: the ones they own, and the ones sent to them. */
export function visibleTo(map: SharedMap, storeId: string): SharedRecord[] {
  return Object.values(map).filter((r) => r.ownerId === storeId || r.sharedWith === storeId);
}

/**
 * Rebuild a shared record into the plain node shape the rest of the app works
 * with, using this person's own position. A person seeing the item for the
 * first time has no stored position yet, so the caller supplies a landing spot.
 */
export function toNode(record: SharedRecord, storeId: string, fallback: { x: number; y: number }): MindNode {
  const pos = record.positions[storeId] ?? fallback;
  return { ...record.content, x: pos.x, y: pos.y };
}

/* ---- Cross-window notification ------------------------------------------
   Two mechanisms on purpose. BroadcastChannel is instant and is what makes the
   item appear while you watch. The `storage` event is the belt-and-braces
   fallback: it fires in other tabs of the same origin even if a channel was
   never opened, which covers a window that loaded before this code did. */

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function announce() {
  getChannel()?.postMessage('changed');
}

/** Calls `onChange` whenever another window writes to the shared store. */
export function subscribe(onChange: () => void): () => void {
  const ch = getChannel();
  const onMessage = () => onChange();
  ch?.addEventListener('message', onMessage);

  const onStorage = (e: StorageEvent) => {
    if (e.key === SHARE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    ch?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}
