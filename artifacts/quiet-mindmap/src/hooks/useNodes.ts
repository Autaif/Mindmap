import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/react';
import { listNodes, syncNodes } from '@workspace/api-client-react';
import type { MindNode as ApiMindNode } from '@workspace/api-client-react';
import type { MindNode, NodeKind } from '../types';
import { guestStoreId } from '../lib/persona';
import { seedsFor } from '../lib/seeds';

const LEGACY_STORAGE_KEY = 'quiet-mindmap-nodes';
const LEGACY_SEEDED_KEY = 'quiet-mindmap-seeded';

const nodesKey = (storeId: string) => `quiet-mindmap-nodes:${storeId}`;
const pendingKey = (storeId: string) => `quiet-mindmap-pending:${storeId}`;
const seededKey = (storeId: string) => `quiet-mindmap-seeded:${storeId}`;

/** `local` = signed out: this browser only, never sent anywhere. */
export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error' | 'local';

interface Pending {
  upserts: string[];
  deletes: string[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Position on an ellipse around world origin (the focus orb). Wider than tall,
 * because screens are — it keeps more of the map in frame at a readable zoom.
 */
const ORBIT_RX = 300;
const ORBIT_RY = 145;
const CHILD_OFFSET = 110;

function radialPosition(index: number, total: number, rx = ORBIT_RX, ry = ORBIT_RY) {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.round(rx * Math.cos(angle)),
    y: Math.round(ry * Math.sin(angle)),
  };
}

function createSeedNodes(storeId: string): MindNode[] {
  const now = new Date().toISOString();
  const out: MindNode[] = [];
  const specs = seedsFor(storeId);

  specs.forEach((spec, i) => {
    const { children, ...rest } = spec;
    const pos = radialPosition(i, specs.length);
    // Seeds carry their own id so seeded attachments can point at them.
    const parentId = rest.id || generateId();
    out.push({ ...rest, id: parentId, parentId: null, createdAt: now, updatedAt: now, ...pos });

    (children ?? []).forEach((child, ci) => {
      const len = Math.hypot(pos.x, pos.y) || 1;
      const ux = pos.x / len;
      const uy = pos.y / len;
      const spread = (ci - ((children!.length - 1) / 2)) * 90;
      out.push({
        ...child,
        id: child.id || generateId(),
        parentId,
        createdAt: now,
        updatedAt: now,
        x: Math.round(pos.x + ux * CHILD_OFFSET - uy * spread),
        y: Math.round(pos.y + uy * CHILD_OFFSET + ux * spread),
      });
    });
  });

  return out;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Repair one stored record's geometry. Coordinates are the only field that can
 * break the whole map if malformed: a single non-finite x/y flows through
 * `fitView`'s min/max into `clampScale`, and a NaN `view.scale` renders as
 * `transform: scale(NaN)` — an invalid declaration the browser drops entirely,
 * disabling pan, zoom, drag and line alignment at once with no error logged.
 *
 * The entry itself is always kept: the title and notes are what the user cannot
 * recover from anywhere else, so a bad coordinate is repaired to the origin
 * (draggable back out) rather than being a reason to discard the record.
 */
function sanitizeNode(n: MindNode): MindNode {
  const x = Number(n.x);
  const y = Number(n.y);
  if (Number.isFinite(x) && Number.isFinite(y)) return n;
  return { ...n, x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

function loadStoredNodes(key: string): MindNode[] {
  const parsed = readJson<unknown>(key, []);
  if (!Array.isArray(parsed)) return [];
  // Never trust stored geometry — this data outlives any given build, so a
  // record corrupted by an older version keeps breaking every future one.
  return (parsed as MindNode[]).filter((n) => !!n && typeof n.id === 'string').map(sanitizeNode);
}

/** Last-write-wins merge of server nodes with locally-pending edits. */
function mergeServer(server: MindNode[], local: MindNode[], pending: Pending): MindNode[] {
  const pendingUpserts = new Set(pending.upserts);
  const pendingDeletes = new Set(pending.deletes);
  const byId = new Map<string, MindNode>();

  for (const s of server) {
    if (pendingDeletes.has(s.id)) continue;
    byId.set(s.id, s);
  }
  for (const l of local) {
    if (pendingDeletes.has(l.id)) continue;
    const s = byId.get(l.id);
    if (!s) {
      // Keep local-only nodes only if they still await upload; otherwise the
      // server (another device) deleted them.
      if (pendingUpserts.has(l.id)) byId.set(l.id, l);
      continue;
    }
    if (pendingUpserts.has(l.id) && l.updatedAt >= s.updatedAt) byId.set(l.id, l);
  }
  return [...byId.values()];
}

export function useNodes(canvasWidth: number, canvasHeight: number) {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  /** Signed out: keep everything in this browser, talk to no server. */
  const isGuest = isLoaded && !userId;
  /**
   * `null` until Clerk resolves. A signed-in user starts with `user === null`,
   * so committing to a store before that would write their entries into the
   * guest bucket.
   */
  const storeId = isLoaded ? (userId ?? guestStoreId()) : null;

  const [nodes, setNodesState] = useState<MindNode[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [readyStore, setReadyStore] = useState<string | null>(null);
  /** True once this store's entries are loaded; mutations are unsafe before. */
  const ready = storeId !== null && readyStore === storeId;

  const nodesRef = useRef<MindNode[]>([]);
  const pendingRef = useRef<Pending>({ upserts: [], deletes: [] });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);
  const initializedFor = useRef<string | null>(null);
  const dirtyPositions = useRef<Set<string>>(new Set());
  /** Bumped whenever identity changes, so in-flight work can disown itself. */
  const epoch = useRef(0);

  // Signing in or out swaps the whole store. Abandon anything mid-flight
  // rather than letting it land on the new identity's data.
  useEffect(() => {
    epoch.current += 1;
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    flushing.current = false;
    pendingRef.current = { upserts: [], deletes: [] };
    dirtyPositions.current.clear();
    setReadyStore(null);
  }, [storeId]);

  const setNodes = useCallback(
    (updater: (prev: MindNode[]) => MindNode[]) => {
      if (!storeId) return;
      setNodesState((prev) => {
        const next = updater(prev);
        nodesRef.current = next;
        localStorage.setItem(nodesKey(storeId), JSON.stringify(next));
        return next;
      });
    },
    [storeId],
  );

  const savePending = useCallback(() => {
    if (!storeId) return;
    localStorage.setItem(pendingKey(storeId), JSON.stringify(pendingRef.current));
  }, [storeId]);

  const enqueue = useCallback(
    (kind: 'upserts' | 'deletes', id: string) => {
      // Nothing to upload when signed out — don't accumulate a phantom queue.
      if (!storeId || isGuest) return;
      const p = pendingRef.current;
      if (kind === 'upserts') {
        p.deletes = p.deletes.filter((d) => d !== id);
        if (!p.upserts.includes(id)) p.upserts.push(id);
      } else {
        p.upserts = p.upserts.filter((u) => u !== id);
        if (!p.deletes.includes(id)) p.deletes.push(id);
      }
      savePending();
    },
    [storeId, isGuest, savePending],
  );

  const flush = useCallback(async () => {
    // Guests have no account to sync to; their map lives in this browser.
    if (isGuest) {
      setSyncStatus('local');
      return;
    }
    if (!userId || flushing.current) return;
    const p = pendingRef.current;
    if (p.upserts.length === 0 && p.deletes.length === 0) {
      setSyncStatus('synced');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    flushing.current = true;
    setSyncStatus('syncing');
    const upsertIds = [...p.upserts];
    const deleteIds = [...p.deletes];
    const current = nodesRef.current;
    const upserts = upsertIds
      .map((id) => current.find((n) => n.id === id))
      .filter((n): n is MindNode => !!n);

    try {
      const merged = await syncNodes({ upserts: upserts as ApiMindNode[], deletes: deleteIds });
      // Remove only what we actually flushed; edits made mid-flight stay queued.
      const pNow = pendingRef.current;
      pNow.upserts = pNow.upserts.filter(
        (id) => !upsertIds.includes(id) || nodesRef.current.find((n) => n.id === id)?.updatedAt !== upserts.find((u) => u.id === id)?.updatedAt,
      );
      pNow.deletes = pNow.deletes.filter((id) => !deleteIds.includes(id));
      savePending();
      setNodes((prev) => mergeServer(merged as MindNode[], prev, pendingRef.current));
      setSyncStatus(
        pendingRef.current.upserts.length || pendingRef.current.deletes.length ? 'syncing' : 'synced',
      );
    } catch {
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      flushing.current = false;
      const pNow = pendingRef.current;
      if (navigator.onLine && (pNow.upserts.length || pNow.deletes.length)) {
        scheduleFlush(2000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isGuest, savePending, setNodes]);

  const scheduleFlush = useCallback(
    (delay = 800) => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  // Initial load per store: adopt the local cache, migrate legacy localStorage
  // entries, then (signed in only) pull from the server and merge.
  useEffect(() => {
    // Wait for Clerk so a signed-in user is never briefly treated as a guest.
    // `storeId` is null exactly while Clerk is still loading, so testing it
    // instead of `isLoaded` is the same guard and also narrows it to a string.
    if (storeId === null) return;
    if (canvasWidth === 0 || canvasHeight === 0) return;
    if (initializedFor.current === storeId) return;
    initializedFor.current = storeId;

    let cancelled = false;

    pendingRef.current = readJson<Pending>(pendingKey(storeId), { upserts: [], deletes: [] });
    let local = loadStoredNodes(nodesKey(storeId));

    // First run under this store on this browser: adopt pre-account entries.
    if (local.length === 0 && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      const legacy = loadStoredNodes(LEGACY_STORAGE_KEY).map((n) =>
        n.parentId === undefined
          ? { ...n, parentId: null, x: Math.round(n.x - canvasWidth / 2), y: Math.round(n.y - canvasHeight / 2) }
          : n,
      );
      if (legacy.length > 0) {
        local = legacy;
        if (!isGuest) for (const n of legacy) enqueue('upserts', n.id);
        localStorage.setItem(seededKey(storeId), '1');
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SEEDED_KEY);
    }

    nodesRef.current = local;
    setNodesState(local);
    localStorage.setItem(nodesKey(storeId), JSON.stringify(local));

    if (isGuest) {
      if (local.length === 0 && !localStorage.getItem(seededKey(storeId))) {
        const seeded = createSeedNodes(storeId);
        localStorage.setItem(seededKey(storeId), '1');
        setNodes(() => seeded);
      }
      setSyncStatus('local');
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const server = await listNodes();
        if (cancelled) return;
        setNodes((prev) => mergeServer(server as MindNode[], prev, pendingRef.current));

        const empty =
          server.length === 0 &&
          nodesRef.current.length === 0 &&
          pendingRef.current.upserts.length === 0;
        if (empty && !localStorage.getItem(seededKey(storeId))) {
          const seeded = createSeedNodes(storeId);
          localStorage.setItem(seededKey(storeId), '1');
          setNodes(() => seeded);
          for (const n of seeded) enqueue('upserts', n.id);
        }
        setSyncStatus('synced');
        void flush();
      } catch {
        if (!cancelled) setSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isGuest, storeId, canvasWidth, canvasHeight, enqueue, setNodes, flush]);

  // Push queued changes as soon as the connection comes back.
  useEffect(() => {
    if (isGuest) return;
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    const onOffline = () => setSyncStatus('offline');
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [isGuest, flush]);

  const addNode = useCallback(
    (input: { title: string; detail: string; kind: NodeKind; owner: string; parentId?: string | null }) => {
      const parentId = input.parentId ?? null;
      const now = new Date().toISOString();
      const id = generateId();
      const current = nodesRef.current;

      let x: number;
      let y: number;

      const parent = parentId ? current.find((n) => n.id === parentId) : undefined;
      if (parent) {
        const siblings = current.filter((n) => n.parentId === parentId).length;
        const len = Math.hypot(parent.x, parent.y) || 1;
        const ux = parent.x / len;
        const uy = parent.y / len;
        const spread = (siblings - 1) * 55 - 40;
        x = Math.round(parent.x + ux * (CHILD_OFFSET + 15) - uy * spread);
        y = Math.round(parent.y + uy * (CHILD_OFFSET + 15) + ux * spread);
      } else {
        const roots = current.filter((n) => n.parentId === null).length;
        const jitter = 1 + Math.random() * 0.2;
        const pos = radialPosition(roots, roots + 1, ORBIT_RX * jitter, ORBIT_RY * jitter);
        x = Math.round(pos.x + (Math.random() - 0.5) * 50);
        y = Math.round(pos.y + (Math.random() - 0.5) * 50);
      }

      const node: MindNode = {
        id,
        title: input.title,
        detail: input.detail,
        kind: input.kind,
        owner: input.owner,
        status: 'open',
        parentId,
        createdAt: now,
        updatedAt: now,
        x,
        y,
      };

      setNodes((prev) => [...prev, node]);
      enqueue('upserts', id);
      scheduleFlush();
      return node;
    },
    [setNodes, enqueue, scheduleFlush],
  );

  const updateNode = useCallback(
    (id: string, changes: Partial<MindNode>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n)),
      );
      enqueue('upserts', id);
      scheduleFlush();
    },
    [setNodes, enqueue, scheduleFlush],
  );

  /** Live drag updates: state only, so connection lines follow in real time. */
  const moveNodeLive = useCallback((id: string, x: number, y: number) => {
    dirtyPositions.current.add(id);
    setNodesState((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, x, y } : n));
      nodesRef.current = next;
      return next;
    });
  }, []);

  /** Called once on pointer-up so we persist a single time per drag. */
  const commitPositions = useCallback(() => {
    const dirty = dirtyPositions.current;
    if (dirty.size === 0) return;
    const now = new Date().toISOString();
    setNodes((prev) => prev.map((n) => (dirty.has(n.id) ? { ...n, updatedAt: now } : n)));
    for (const id of dirty) enqueue('upserts', id);
    dirty.clear();
    scheduleFlush();
  }, [setNodes, enqueue, scheduleFlush]);

  /** Removing a node promotes its children to the removed node's own parent. */
  const deleteNode = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const promoted: string[] = [];
      setNodes((prev) => {
        const target = prev.find((n) => n.id === id);
        const newParent = target?.parentId ?? null;
        return prev
          .filter((n) => n.id !== id)
          .map((n) => {
            if (n.parentId !== id) return n;
            promoted.push(n.id);
            return { ...n, parentId: newParent, updatedAt: now };
          });
      });
      enqueue('deletes', id);
      for (const pid of promoted) enqueue('upserts', pid);
      scheduleFlush();
    },
    [setNodes, enqueue, scheduleFlush],
  );

  const clearAllNodes = useCallback(() => {
    const ids = nodesRef.current.map((n) => n.id);
    setNodes(() => []);
    if (userId) localStorage.setItem(seededKey(userId), 'cleared');
    for (const id of ids) enqueue('deletes', id);
    scheduleFlush();
  }, [setNodes, userId, enqueue, scheduleFlush]);

  return { nodes, addNode, updateNode, moveNodeLive, commitPositions, deleteNode, clearAllNodes, syncStatus };
}
