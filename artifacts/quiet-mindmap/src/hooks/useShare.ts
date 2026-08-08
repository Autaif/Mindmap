import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Attachment, MindNode } from '../types';
import {
  loadShared,
  saveShared,
  subscribe,
  visibleTo,
  toNode,
  type SharedMap,
  type SharedRecord,
} from '../lib/shareStore';

/** Where an item lands on the recipient's map: just outside their Work orb. */
const ARRIVAL_RX = 250;
const ARRIVAL_RY = 130;

/** Same attachments, same order — enough to decide whether a write is needed. */
function sameAttachments(a: Attachment[], b: Attachment[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.id === b[i].id);
}

/**
 * Spread arrivals around the recipient's orb instead of stacking them all on
 * one spot. Derived from the item's own id so it stays put across reloads
 * rather than jumping to a new angle each time the page opens.
 */
function arrivalPosition(nodeId: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  return {
    x: Math.round(Math.cos(angle) * ARRIVAL_RX),
    y: Math.round(Math.sin(angle) * ARRIVAL_RY),
  };
}

/**
 * The shared half of a person's map: items they sent, and items sent to them.
 * Reads and writes the one shared record per item, so both people see the same
 * title, notes and status — only position is per person.
 */
export function useShare(storeId: string | null) {
  const [map, setMapState] = useState<SharedMap>({});
  const mapRef = useRef<SharedMap>({});
  const storeIdRef = useRef(storeId);
  /** True once a shared item has been dragged but not yet persisted. */
  const dirtyPositions = useRef(false);

  const commit = useCallback((next: SharedMap) => {
    mapRef.current = next;
    setMapState(next);
    saveShared(next);
  }, []);

  useEffect(() => {
    storeIdRef.current = storeId;
  }, [storeId]);

  // Load, and re-read whenever the other window writes. Re-reading wholesale is
  // safe because every write goes through `commit`, so there is never a local
  // edit in flight that a reload could discard.
  useEffect(() => {
    const reload = () => {
      const next = loadShared();
      mapRef.current = next;
      setMapState(next);
    };
    reload();
    return subscribe(reload);
  }, []);

  /** Shared items visible to this person, as ordinary nodes with their own geometry. */
  const sharedNodes = useMemo<MindNode[]>(() => {
    if (!storeId) return [];
    return visibleTo(map, storeId).map((r) => toNode(r, storeId, arrivalPosition(r.id)));
  }, [map, storeId]);

  const sharedIds = useMemo(() => new Set(sharedNodes.map((n) => n.id)), [sharedNodes]);

  /**
   * Records still in someone else's hands. Distinct from `sharedIds`, which is
   * everything the share layer owns and therefore everything whose edits must
   * be routed there — a returned entry is still one of those, but it should no
   * longer be badged as shared.
   */
  const activeShareIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of Object.values(map)) if (r.sharedWith) ids.add(r.id);
    return ids;
  }, [map]);

  /**
   * Attachments belonging to shared items. The recipient has no record of these
   * in their own store, so this is the only place they come from.
   */
  const sharedAttachments = useMemo<Attachment[]>(() => {
    if (!storeId) return [];
    return visibleTo(map, storeId).flatMap((r) => r.attachments ?? []);
  }, [map, storeId]);

  /** Who each shared item involves, for the badge on the bubble and in the panel. */
  const shareInfo = useMemo(() => {
    const info = new Map<string, { ownerId: string; sharedWith: string }>();
    for (const r of Object.values(map)) info.set(r.id, { ownerId: r.ownerId, sharedWith: r.sharedWith });
    return info;
  }, [map]);

  /**
   * Hand an item to the other person. The sender keeps it — they remain the
   * owner and it stays on their map at the position it already occupied.
   */
  const shareNode = useCallback(
    (node: MindNode, toStoreId: string, attachments: Attachment[]) => {
      const me = storeIdRef.current;
      if (!me) return;
      const { x, y, ...content } = node;
      const record: SharedRecord = {
        id: node.id,
        ownerId: me,
        sharedWith: toStoreId,
        content: { ...content, updatedAt: new Date().toISOString() },
        positions: { [me]: { x, y } },
        attachments,
      };
      commit({ ...mapRef.current, [node.id]: record });
    },
    [commit],
  );

  /**
   * Re-publish an item's attachments after one is added or removed, so a
   * picture attached *after* sending still reaches the other person.
   */
  const syncSharedAttachments = useCallback(
    (nodeId: string, attachments: Attachment[]) => {
      const record = mapRef.current[nodeId];
      if (!record) return;
      // Bail out when nothing actually changed. Callers watch their own
      // attachment list and re-run on any render, and committing regardless
      // would rewrite the store, which regenerates the very state they watch —
      // an endless loop, and a broadcast to the other window on every pass.
      if (sameAttachments(record.attachments ?? [], attachments)) return;
      commit({ ...mapRef.current, [nodeId]: { ...record, attachments } });
    },
    [commit],
  );

  /** Take an item back out of the shared area; the owner keeps it privately. */
  const unshareNode = useCallback(
    (id: string) => {
      const next = { ...mapRef.current };
      delete next[id];
      commit(next);
    },
    [commit],
  );

  /**
   * Hand it back to whoever sent it. The record is kept and only its recipient
   * is cleared, so everything either of them changed while it was shared stays
   * on the sender's copy — deleting the record instead would silently revert it
   * to whatever it said before the send.
   */
  const returnNode = useCallback(
    (id: string) => {
      const record = mapRef.current[id];
      if (!record) return;
      commit({ ...mapRef.current, [id]: { ...record, sharedWith: '' } });
    },
    [commit],
  );

  const isShared = useCallback((id: string) => id in mapRef.current, []);

  /**
   * Edit the one shared record. Whichever side makes the change, both see it —
   * that is the whole point of a single record.
   */
  const updateSharedNode = useCallback(
    (id: string, changes: Partial<MindNode>) => {
      const record = mapRef.current[id];
      if (!record) return;
      const me = storeIdRef.current;
      const { x, y, ...contentChanges } = changes;

      const positions = { ...record.positions };
      if (me && (x !== undefined || y !== undefined)) {
        const current = positions[me] ?? arrivalPosition(id);
        positions[me] = { x: x ?? current.x, y: y ?? current.y };
      }

      commit({
        ...mapRef.current,
        [id]: {
          ...record,
          content: { ...record.content, ...contentChanges, updatedAt: new Date().toISOString() },
          positions,
        },
      });
    },
    [commit],
  );

  /**
   * Drag updates, state-only. Writing to storage on every frame would broadcast
   * to the other window on every frame too; `commitSharedPositions` persists
   * once on release, matching how `useNodes` and `useOrbs` already behave.
   */
  const moveSharedLive = useCallback((id: string, x: number, y: number) => {
    const me = storeIdRef.current;
    if (!me) return;
    setMapState((prev) => {
      const record = prev[id];
      if (!record) return prev;
      const next = {
        ...prev,
        [id]: { ...record, positions: { ...record.positions, [me]: { x, y } } },
      };
      mapRef.current = next;
      dirtyPositions.current = true;
      return next;
    });
  }, []);

  const commitSharedPositions = useCallback(() => {
    // Every drag on the map ends here, including drags of entries that aren't
    // shared at all. Writing regardless would broadcast to the other window on
    // every pointer-up and make it re-read the store for nothing.
    if (!dirtyPositions.current) return;
    dirtyPositions.current = false;
    saveShared(mapRef.current);
  }, []);

  /** Removing a shared item removes it for both people — it is one record. */
  const deleteSharedNode = useCallback(
    (id: string) => {
      if (!(id in mapRef.current)) return false;
      const next = { ...mapRef.current };
      delete next[id];
      commit(next);
      return true;
    },
    [commit],
  );

  return {
    sharedNodes,
    sharedIds,
    activeShareIds,
    sharedAttachments,
    shareInfo,
    shareNode,
    syncSharedAttachments,
    unshareNode,
    returnNode,
    isShared,
    updateSharedNode,
    moveSharedLive,
    commitSharedPositions,
    deleteSharedNode,
  };
}
