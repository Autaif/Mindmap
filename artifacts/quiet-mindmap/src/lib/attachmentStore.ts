import type { Attachment, AttachmentKind } from '../types';

const DB_NAME = 'quiet-mindmap-attachments';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

/** Individual file/image cap. Generous for local IndexedDB, small enough to avoid stalls. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
export const FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.json',
];
export const ATTACHMENT_ACCEPT = [...IMAGE_EXTENSIONS, ...FILE_EXTENSIONS].join(',');

function metaKey(storeId: string) {
  return `quiet-mindmap-attachments:${storeId}`;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function extensionOf(name: string) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

export function kindForFile(file: File): AttachmentKind {
  if (file.type.startsWith('image/')) return 'image';
  if (IMAGE_EXTENSIONS.includes(extensionOf(file.name))) return 'image';
  return 'file';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function loadAttachmentMeta(storeId: string): Attachment[] {
  try {
    const raw = localStorage.getItem(metaKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Attachment[]) : [];
  } catch {
    return [];
  }
}

export function saveAttachmentMeta(storeId: string, attachments: Attachment[]) {
  localStorage.setItem(metaKey(storeId), JSON.stringify(attachments));
}

export function makeAttachmentId() {
  return generateId();
}
