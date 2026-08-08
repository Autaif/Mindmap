import { useState, useCallback, useEffect, useRef } from 'react';
import type { Attachment } from '../types';
import {
  loadAttachmentMeta,
  saveAttachmentMeta,
  putBlob,
  deleteBlob,
  makeAttachmentId,
  kindForFile,
  MAX_ATTACHMENT_BYTES,
} from '../lib/attachmentStore';
import { seedAttachmentsFor } from '../lib/seeds';
import { useUser } from './useAuth';
import { listAttachments, putAttachment, removeAttachmentRow } from '../lib/nodesTransport';

const attachmentsSeededKey = (storeId: string) => `quiet-mindmap-attachments-seeded:${storeId}`;

/**
 * Local-only attachments: metadata in localStorage, bytes in IndexedDB
 * (see `lib/attachmentStore`). Deliberately not part of `useNodes`/the sync
 * API — attachments never leave this browser.
 */
export function useAttachments(storeId: string | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const storeIdRef = useRef(storeId);
  const { user } = useUser();
  const accountId = user?.id ?? null;
  /**
   * Signed in, attachments live in the database so they travel with a shared
   * entry. Signed out, they stay in this browser. The two are never mixed: a
   * store id is either an account or a local persona, never both.
   */
  const onServer = !!accountId;
  const onServerRef = useRef(onServer);
  onServerRef.current = onServer;
  /** Latest known set, readable from callbacks that must not close over state. */
  const localOnlyRef = useRef<Attachment[]>([]);

  useEffect(() => {
    storeIdRef.current = storeId;
    if (!storeId) {
      setAttachments([]);
      return;
    }

    let loaded = loadAttachmentMeta(storeId);

    // Install the demo pictures once per store. Gated by its own flag rather
    // than by "is the list empty", so removing a seeded picture keeps it
    // removed instead of resurrecting it on the next load.
    const seededFlag = attachmentsSeededKey(storeId);
    if (!localStorage.getItem(seededFlag)) {
      const seeded = seedAttachmentsFor(storeId);
      localStorage.setItem(seededFlag, '1');
      if (seeded.length > 0) {
        loaded = [...loaded, ...seeded];
        saveAttachmentMeta(storeId, loaded);
      }
    }

    setAttachments(loaded);
    localOnlyRef.current = loaded;

    // Signed in: publish whatever this account holds locally (the seeded
    // pictures on a fresh sign-in) so the same set is visible from any device
    // and travels with a shared entry.
    if (onServerRef.current) void publishLocalOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const persist = useCallback((next: Attachment[]) => {
    setAttachments(next);
    localOnlyRef.current = next;
    if (storeIdRef.current) saveAttachmentMeta(storeIdRef.current, next);
  }, []);

  /**
   * Push anything held only in this browser up to the database.
   *
   * Each row is attempted on its own, because an attachment can legitimately
   * fail while its entry has not reached the server yet: the insert policy
   * requires the entry to exist, so it is rejected until the outbound queue has
   * flushed. Aborting the whole batch on the first such rejection would leave
   * the rest permanently unpublished. Callers re-run this once sync settles.
   */
  const publishLocalOnly = useCallback(async () => {
    if (!onServerRef.current || !storeIdRef.current) return;
    try {
      const remote = await listAttachments();
      const remoteIds = new Set(remote.map((a) => a.id));
      const pending = localOnlyRef.current.filter((a) => !remoteIds.has(a.id));

      let published = 0;
      for (const a of pending) {
        try {
          await putAttachment(a);
          published += 1;
        } catch {
          // Its entry is not on the server yet — try again next time.
        }
      }

      const merged = published > 0 ? await listAttachments() : remote;
      // Keep anything still unpublished visible; it exists in this browser even
      // if the database has not accepted it yet.
      const mergedIds = new Set(merged.map((a) => a.id));
      const next = [...merged, ...localOnlyRef.current.filter((a) => !mergedIds.has(a.id))];
      setAttachments(next);
      if (storeIdRef.current) saveAttachmentMeta(storeIdRef.current, next);
    } catch {
      // Offline or misconfigured: whatever is already on screen stays.
    }
  }, []);

  /** Pull the server's set — used when a shared entry arrives with pictures. */
  const refreshAttachments = useCallback(async () => {
    if (!onServerRef.current || !storeIdRef.current) return;
    await publishLocalOnly();
  }, [publishLocalOnly]);

  const addFileAttachment = useCallback(
    async (nodeId: string, file: File) => {
      if (!storeIdRef.current) return null;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error(`"${file.name}" is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB`);
      }
      const id = makeAttachmentId();
      // Always keep a local copy: it makes the thumbnail appear immediately and
      // keeps the picture readable if the upload or the network fails.
      await putBlob(id, file);
      let attachment: Attachment = {
        id,
        nodeId,
        kind: kindForFile(file),
        name: file.name,
        mimeType: file.type || undefined,
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      if (onServerRef.current) {
        // Uploading is what lets the other person see it at all, so a failure
        // here is worth surfacing rather than silently leaving a local-only file.
        attachment = await putAttachment(attachment, file);
      }

      persist([...attachments, attachment]);
      return attachment;
    },
    [attachments, persist],
  );

  const addLinkAttachment = useCallback(
    (nodeId: string, url: string, name?: string) => {
      const attachment: Attachment = {
        id: makeAttachmentId(),
        nodeId,
        kind: 'link',
        name: name?.trim() || url,
        url,
        createdAt: new Date().toISOString(),
      };
      persist([...attachments, attachment]);
      if (onServerRef.current) void putAttachment(attachment);
      return attachment;
    },
    [attachments, persist],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      const target = attachments.find((a) => a.id === id);
      persist(attachments.filter((a) => a.id !== id));
      // Links have no bytes, and seeded pictures are files served by the app —
      // neither has anything in IndexedDB to remove.
      if (target && target.kind !== 'link' && !target.assetUrl) void deleteBlob(id);
      if (target && onServerRef.current) void removeAttachmentRow(target);
    },
    [attachments, persist],
  );

  const removeAttachmentsForNode = useCallback(
    (nodeId: string) => {
      const toRemove = attachments.filter((a) => a.nodeId === nodeId);
      if (toRemove.length === 0) return;
      persist(attachments.filter((a) => a.nodeId !== nodeId));
      for (const a of toRemove) {
        if (a.kind !== 'link' && !a.assetUrl) void deleteBlob(a.id);
        if (onServerRef.current) void removeAttachmentRow(a);
      }
    },
    [attachments, persist],
  );

  const getAttachmentsForNode = useCallback(
    (nodeId: string) => attachments.filter((a) => a.nodeId === nodeId),
    [attachments],
  );

  return {
    attachments,
    addFileAttachment,
    addLinkAttachment,
    removeAttachment,
    removeAttachmentsForNode,
    getAttachmentsForNode,
    refreshAttachments,
  };
}
