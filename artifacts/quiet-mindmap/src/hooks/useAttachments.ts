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

const attachmentsSeededKey = (storeId: string) => `quiet-mindmap-attachments-seeded:${storeId}`;

/**
 * Local-only attachments: metadata in localStorage, bytes in IndexedDB
 * (see `lib/attachmentStore`). Deliberately not part of `useNodes`/the sync
 * API — attachments never leave this browser.
 */
export function useAttachments(storeId: string | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const storeIdRef = useRef(storeId);

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
  }, [storeId]);

  const persist = useCallback((next: Attachment[]) => {
    setAttachments(next);
    if (storeIdRef.current) saveAttachmentMeta(storeIdRef.current, next);
  }, []);

  const addFileAttachment = useCallback(
    async (nodeId: string, file: File) => {
      if (!storeIdRef.current) return null;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error(`"${file.name}" is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB`);
      }
      const id = makeAttachmentId();
      await putBlob(id, file);
      const attachment: Attachment = {
        id,
        nodeId,
        kind: kindForFile(file),
        name: file.name,
        mimeType: file.type || undefined,
        size: file.size,
        createdAt: new Date().toISOString(),
      };
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
  };
}
