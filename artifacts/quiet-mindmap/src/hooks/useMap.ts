import { useCallback, useMemo } from 'react';
import type { Attachment, MindNode } from '../types';
import { useNodes } from './useNodes';
import { useShare } from './useShare';
import { useUser } from './useAuth';
import { shareNodeWith, unshareNode as unshareServerNode, returnSharedNode } from '../lib/nodesTransport';

/**
 * One map, assembled from two sources: the person's private entries
 * (`useNodes`, unchanged) and the items shared with the other person
 * (`useShare`).
 *
 * This exists so the rest of the app never learns that a node might be shared.
 * It exposes exactly the interface `useNodes` already did, and routes each
 * mutation to whichever half owns that entry — so filters, the list, the digest,
 * connection lines and orbs all keep working with no knowledge of sharing.
 *
 * Sharing does not remove the private copy; it hides it behind the shared
 * record. That copy is what an item returns to when it is un-shared, and it
 * means the sync engine's queue is never touched by a share.
 */
export function useMap(canvasWidth: number, canvasHeight: number, storeId: string | null) {
  const base = useNodes(canvasWidth, canvasHeight);
  const share = useShare(storeId);
  const { user } = useUser();
  const accountId = user?.id ?? null;

  /**
   * Signed in, sharing is a column on the entry itself and the database decides
   * who may see it. Signed out, it is the local shared store. The two never run
   * at once: the local store is keyed by persona ids, which no account matches.
   */
  const onServer = !!accountId;

  const {
    sharedNodes,
    sharedIds,
    activeShareIds,
    sharedAttachments,
    shareInfo,
    shareNode: shareRecord,
    syncSharedAttachments,
    unshareNode: unshareRecord,
    returnNode: returnRecord,
    updateSharedNode,
    moveSharedLive,
    commitSharedPositions,
    deleteSharedNode,
  } = share;

  /** Shared records win over the hidden private copy of the same id. */
  const nodes = useMemo<MindNode[]>(
    () => (onServer ? base.nodes : [...base.nodes.filter((n) => !sharedIds.has(n.id)), ...sharedNodes]),
    [onServer, base.nodes, sharedNodes, sharedIds],
  );

  /**
   * Entries currently in someone else's hands, from whichever source is in
   * play. A returned entry drops out of this set on both paths.
   */
  const effectiveSharedIds = useMemo(() => {
    if (!onServer) return activeShareIds;
    return new Set(base.nodes.filter((n) => !!n.sharedWith).map((n) => n.id));
  }, [onServer, activeShareIds, base.nodes]);

  const isOwnerOf = useCallback(
    (id: string) => {
      if (onServer) {
        const node = base.nodes.find((n) => n.id === id);
        return !!node && node.ownerId === accountId;
      }
      return shareInfo.get(id)?.ownerId === storeId;
    },
    [onServer, base.nodes, accountId, shareInfo, storeId],
  );

  // Signed in, every entry is a server entry — including shared ones, which are
  // one row both accounts may edit. Only the signed-out map needs the split.
  const updateNode = useCallback(
    (id: string, changes: Partial<MindNode>) => {
      if (!onServer && sharedIds.has(id)) updateSharedNode(id, changes);
      else base.updateNode(id, changes);
    },
    [onServer, sharedIds, updateSharedNode, base],
  );

  const moveNodeLive = useCallback(
    (id: string, x: number, y: number) => {
      if (!onServer && sharedIds.has(id)) moveSharedLive(id, x, y);
      else base.moveNodeLive(id, x, y);
    },
    [onServer, sharedIds, moveSharedLive, base],
  );

  // Both halves track their own dirty set and no-op when there is nothing to
  // write, so calling both on every pointer-up is cheap and order-independent.
  const commitPositions = useCallback(() => {
    base.commitPositions();
    commitSharedPositions();
  }, [base, commitSharedPositions]);

  /**
   * Only the owner may delete a shared item — otherwise the director tidying his
   * map would silently remove the assistant's record of the same concern. The
   * recipient's equivalent is marking it handled, which is the point.
   */
  const deleteNode = useCallback(
    (id: string) => {
      if (!effectiveSharedIds.has(id)) {
        base.deleteNode(id);
        return;
      }
      if (!isOwnerOf(id)) return;
      if (!onServer) deleteSharedNode(id);
      base.deleteNode(id);
    },
    [onServer, effectiveSharedIds, isOwnerOf, deleteSharedNode, base],
  );

  const shareNode = useCallback(
    (id: string, toStoreId: string, attachments: Attachment[]) => {
      if (onServer) {
        // The entry must exist server-side before it can be handed over, and a
        // freshly typed one may still be sitting in the outbound queue.
        void base.flushNow().then(() => shareNodeWith(id, toStoreId)).then(base.refresh);
        return;
      }
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      shareRecord(node, toStoreId, attachments);
    },
    [onServer, base, nodes, shareRecord],
  );

  /** Take it back: it stays here and leaves the other person's map. */
  const unshareNode = useCallback(
    (id: string) => {
      if (!isOwnerOf(id)) return;
      if (onServer) {
        void unshareServerNode(id).then(base.refresh);
        return;
      }
      const current = sharedNodes.find((n) => n.id === id);
      if (!current) return;
      const { x, y, ...content } = current;
      base.updateNode(id, content);
      unshareRecord(id);
    },
    [onServer, isOwnerOf, base, sharedNodes, unshareRecord],
  );

  /**
   * The recipient's counterpart to take-back: hand it back to whoever sent it.
   * It leaves this map and stays on theirs, carrying whatever either of them
   * changed while it was shared.
   */
  const returnNode = useCallback(
    (id: string) => {
      if (isOwnerOf(id)) return;
      if (onServer) {
        void returnSharedNode(id).then(base.refresh);
        return;
      }
      returnRecord(id);
    },
    [onServer, isOwnerOf, base, returnRecord],
  );

  const clearAllNodes = useCallback(() => {
    for (const n of sharedNodes) {
      if (isOwnerOf(n.id)) deleteSharedNode(n.id);
    }
    base.clearAllNodes();
  }, [sharedNodes, isOwnerOf, deleteSharedNode, base]);

  return {
    nodes,
    addNode: base.addNode,
    updateNode,
    moveNodeLive,
    commitPositions,
    deleteNode,
    clearAllNodes,
    syncStatus: base.syncStatus,
    /**
     * Push queued entries now. Anything that attaches to an entry server-side
     * needs it to exist first — the attachment policies check for it.
     */
    flushNow: base.flushNow,
    // Sharing surface, used only by the panel and the bubble badge.
    sharedIds: effectiveSharedIds,
    sharedAttachments,
    shareInfo,
    shareNode,
    syncSharedAttachments,
    unshareNode,
    returnNode,
    isOwnerOf,
  };
}
