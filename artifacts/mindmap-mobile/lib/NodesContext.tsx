import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { ApiError, listNodes, syncNodes } from '@workspace/api-client-react';
import type { MindNode as ApiMindNode } from '@workspace/api-client-react';
import { makeId, MindNode, NodeKind, NodeStatus } from '@/lib/types';

/** Pre-account entries lived here; migrated to the signed-in account once. */
const LEGACY_STORAGE_KEY = 'quiet-mindmap.nodes.v1';

const nodesKey = (userId: string) => `quiet-mindmap.nodes:${userId}`;
const pendingKey = (userId: string) => `quiet-mindmap.pending:${userId}`;

export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error';

interface Pending {
  upserts: string[];
  deletes: string[];
}

interface NodesContextValue {
  nodes: MindNode[];
  loading: boolean;
  syncStatus: SyncStatus;
  addNode: (input: { title: string; kind: NodeKind; detail?: string }) => MindNode;
  updateNode: (
    id: string,
    patch: Partial<Pick<MindNode, 'title' | 'detail' | 'kind' | 'status' | 'owner'>>,
  ) => void;
  deleteNode: (id: string) => void;
}

const NodesContext = createContext<NodesContextValue | null>(null);

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

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function loadStoredNodes(key: string): Promise<MindNode[]> {
  const parsed = await readJson<unknown>(key, []);
  return Array.isArray(parsed) ? (parsed as MindNode[]) : [];
}

/** Server (or auth) rejected the request — retrying alone won't fix it. */
function isServerRejection(err: unknown): boolean {
  return err instanceof ApiError;
}

export function NodesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [nodes, setNodesState] = useState<MindNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  const nodesRef = useRef<MindNode[]>([]);
  const pendingRef = useRef<Pending>({ upserts: [], deletes: [] });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);
  const initializedFor = useRef<string | null>(null);

  const setNodes = useCallback(
    (updater: (prev: MindNode[]) => MindNode[]) => {
      setNodesState((prev) => {
        const next = updater(prev);
        nodesRef.current = next;
        if (userId) {
          AsyncStorage.setItem(nodesKey(userId), JSON.stringify(next)).catch(() => {
            // Persist failure is non-fatal; next write retries.
          });
        }
        return next;
      });
    },
    [userId],
  );

  const savePending = useCallback(() => {
    if (userId) {
      AsyncStorage.setItem(pendingKey(userId), JSON.stringify(pendingRef.current)).catch(
        () => {},
      );
    }
  }, [userId]);

  const enqueue = useCallback(
    (kind: 'upserts' | 'deletes', id: string) => {
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
    [savePending],
  );

  const flushRef = useRef<() => Promise<void>>(async () => {});
  const pullRef = useRef<() => Promise<void>>(async () => {});
  /** True until we have managed at least one successful server pull. */
  const needsPull = useRef(true);

  const scheduleFlush = useCallback((delay = 800) => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      // Recover the initial server load first if it never succeeded — pull
      // re-triggers the flush on success.
      if (needsPull.current) void pullRef.current();
      else void flushRef.current();
    }, delay);
  }, []);

  const flush = useCallback(async () => {
    if (!userId || flushing.current) return;
    const p = pendingRef.current;
    if (p.upserts.length === 0 && p.deletes.length === 0) {
      setSyncStatus('synced');
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
        (id) =>
          !upsertIds.includes(id) ||
          nodesRef.current.find((n) => n.id === id)?.updatedAt !==
            upserts.find((u) => u.id === id)?.updatedAt,
      );
      pNow.deletes = pNow.deletes.filter((id) => !deleteIds.includes(id));
      savePending();
      setNodes((prev) => mergeServer(merged as MindNode[], prev, pendingRef.current));
      setSyncStatus(
        pendingRef.current.upserts.length || pendingRef.current.deletes.length
          ? 'syncing'
          : 'synced',
      );
    } catch (err) {
      // No reliable connectivity signal on native — treat network failures as
      // offline and keep retrying with backoff until the network returns.
      // Server rejections (4xx/5xx) surface as errors instead.
      setSyncStatus(isServerRejection(err) ? 'error' : 'offline');
      flushing.current = false;
      scheduleFlush(5000);
      return;
    }
    flushing.current = false;
    const pNow = pendingRef.current;
    if (pNow.upserts.length || pNow.deletes.length) scheduleFlush(2000);
  }, [userId, savePending, setNodes, scheduleFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** Pull the server node list and merge it over local state (LWW). */
  const pull = useCallback(async () => {
    if (!userId) return;
    setSyncStatus('syncing');
    try {
      const server = await listNodes();
      needsPull.current = false;
      setNodes((prev) => mergeServer(server as MindNode[], prev, pendingRef.current));
      setSyncStatus('synced');
      void flushRef.current();
    } catch (err) {
      setSyncStatus(isServerRejection(err) ? 'error' : 'offline');
      scheduleFlush(5000);
    }
  }, [userId, setNodes, scheduleFlush]);

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);

  // Initial load per user: adopt local cache, migrate pre-account AsyncStorage
  // entries on first login, then pull from the server and merge.
  useEffect(() => {
    if (!userId) return;
    if (initializedFor.current === userId) return;
    initializedFor.current = userId;

    let cancelled = false;

    (async () => {
      const storedPending = await readJson<Pending>(pendingKey(userId), {
        upserts: [],
        deletes: [],
      });
      let local = await loadStoredNodes(nodesKey(userId));

      // Edits made while this async init was running (queue + nodes) must not
      // be clobbered — union the pending queues and overlay in-memory nodes.
      const prePending = pendingRef.current;
      pendingRef.current = {
        upserts: [...new Set([...storedPending.upserts, ...prePending.upserts])],
        deletes: [...new Set([...storedPending.deletes, ...prePending.deletes])],
      };

      // First login on this device: migrate pre-account entries to the account.
      const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (local.length === 0 && legacyRaw) {
        let legacy: MindNode[] = [];
        try {
          const parsed = JSON.parse(legacyRaw) as unknown;
          if (Array.isArray(parsed)) legacy = parsed as MindNode[];
        } catch {
          // Corrupt legacy storage — nothing to migrate.
        }
        legacy = legacy.map((n) => (n.parentId === undefined ? { ...n, parentId: null } : n));
        if (legacy.length > 0) {
          local = legacy;
          for (const n of legacy) enqueue('upserts', n.id);
        }
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      }

      if (cancelled) return;
      // Overlay nodes created/edited in memory during init on top of the cache.
      const byId = new Map(local.map((n) => [n.id, n] as const));
      for (const n of nodesRef.current) byId.set(n.id, n);
      const deleted = new Set(pendingRef.current.deletes);
      const merged = [...byId.values()].filter((n) => !deleted.has(n.id));

      nodesRef.current = merged;
      setNodesState(merged);
      setLoading(false);
      savePending();
      await AsyncStorage.setItem(nodesKey(userId), JSON.stringify(merged)).catch(() => {});

      void pullRef.current();
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enqueue, setNodes, scheduleFlush]);

  // Retry the server pull / queued changes when the app returns to the
  // foreground (the closest thing to an "online" event on native).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (needsPull.current) void pullRef.current();
      else void flushRef.current();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  const addNode = useCallback(
    (input: { title: string; kind: NodeKind; detail?: string }): MindNode => {
      const now = new Date().toISOString();
      // Scatter around origin so entries land nicely on the web canvas.
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 160;
      const node: MindNode = {
        id: makeId(),
        title: input.title.trim(),
        detail: input.detail?.trim() ?? '',
        kind: input.kind,
        owner: '',
        status: 'open',
        parentId: null,
        createdAt: now,
        updatedAt: now,
        x: Math.round(Math.cos(angle) * dist),
        y: Math.round(Math.sin(angle) * dist),
      };
      setNodes((prev) => [node, ...prev]);
      enqueue('upserts', node.id);
      scheduleFlush();
      return node;
    },
    [setNodes, enqueue, scheduleFlush],
  );

  const updateNode = useCallback(
    (
      id: string,
      patch: Partial<Pick<MindNode, 'title' | 'detail' | 'kind' | 'status' | 'owner'>>,
    ) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
        ),
      );
      enqueue('upserts', id);
      scheduleFlush();
    },
    [setNodes, enqueue, scheduleFlush],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const promoted: string[] = [];
      setNodes((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (!removed) return prev;
        // Promote children to the deleted node's parent (matches web behavior).
        return prev
          .filter((n) => n.id !== id)
          .map((n) => {
            if (n.parentId !== id) return n;
            promoted.push(n.id);
            return { ...n, parentId: removed.parentId, updatedAt: now };
          });
      });
      enqueue('deletes', id);
      for (const pid of promoted) enqueue('upserts', pid);
      scheduleFlush();
    },
    [setNodes, enqueue, scheduleFlush],
  );

  const value = useMemo(
    () => ({ nodes, loading, syncStatus, addNode, updateNode, deleteNode }),
    [nodes, loading, syncStatus, addNode, updateNode, deleteNode],
  );

  return <NodesContext.Provider value={value}>{children}</NodesContext.Provider>;
}

export function useNodes(): NodesContextValue {
  const ctx = useContext(NodesContext);
  if (!ctx) throw new Error('useNodes must be used within NodesProvider');
  return ctx;
}

export function useNodeStatusActions() {
  const { updateNode } = useNodes();
  return {
    markHandled: (id: string) => updateNode(id, { status: 'handled' as NodeStatus }),
    reopen: (id: string) => updateNode(id, { status: 'open' as NodeStatus }),
    archive: (id: string) => updateNode(id, { status: 'archived' as NodeStatus }),
  };
}
