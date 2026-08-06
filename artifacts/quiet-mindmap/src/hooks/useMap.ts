import { useCallback, useMemo } from 'react';
import type { Attachment, MindNode } from '../types';
import { useNodes } from './useNodes';
import { useShare } from './useShare';

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

  const {
    sharedNodes,
    sharedIds,
    sharedAttachments,
    shareInfo,
    shareNode: shareRecord,
    syncSharedAttachments,
    unshareNode: unshareRecord,
    updateSharedNode,
    moveSharedLive,
    commitSharedPositions,
    deleteSharedNode,
  } = share;

  /** Shared records win over the hidden private copy of the same id. */
  const nodes = useMemo<MindNode[]>(
    () => [...base.nodes.filter((n) => !sharedIds.has(n.id)), ...sharedNodes],
    [base.nodes, sharedNodes, sharedIds],
  );

  const isOwnerOf = useCallback(
    (id: string) => shareInfo.get(id)?.ownerId === storeId,
    [shareInfo, storeId],
  );

  const updateNode = useCallback(
    (id: string, changes: Partial<MindNode>) => {
      if (sharedIds.has(id)) updateSharedNode(id, changes);
      else base.updateNode(id, changes);
    },
    [sharedIds, updateSharedNode, base],
  );

  const moveNodeLive = useCallback(
    (id: string, x: number, y: number) => {
      if (sharedIds.has(id)) moveSharedLive(id, x, y);
      else base.moveNodeLive(id, x, y);
    },
    [sharedIds, moveSharedLive, base],
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
      if (!sharedIds.has(id)) {
        base.deleteNode(id);
        return;
      }
      if (!isOwnerOf(id)) return;
      deleteSharedNode(id);
      base.deleteNode(id);
    },
    [sharedIds, isOwnerOf, deleteSharedNode, base],
  );

  const shareNode = useCallback(
    (id: string, toStoreId: string, attachments: Attachment[]) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      shareRecord(node, toStoreId, attachments);
    },
    [nodes, shareRecord],
  );

  /** Take it back: the latest shared content is written into the private copy. */
  const unshareNode = useCallback(
    (id: string) => {
      const current = sharedNodes.find((n) => n.id === id);
      if (!current || !isOwnerOf(id)) return;
      const { x, y, ...content } = current;
      base.updateNode(id, content);
      unshareRecord(id);
    },
    [sharedNodes, isOwnerOf, base, unshareRecord],
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
    // Sharing surface, used only by the panel and the bubble badge.
    sharedIds,
    sharedAttachments,
    shareInfo,
    shareNode,
    syncSharedAttachments,
    unshareNode,
    isOwnerOf,
  };
}
