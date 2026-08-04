import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeId, MindNode, NodeKind, NodeStatus } from '@/lib/types';

const STORAGE_KEY = 'quiet-mindmap.nodes.v1';

interface NodesContextValue {
  nodes: MindNode[];
  loading: boolean;
  addNode: (input: { title: string; kind: NodeKind; detail?: string }) => MindNode;
  updateNode: (
    id: string,
    patch: Partial<Pick<MindNode, 'title' | 'detail' | 'kind' | 'status' | 'owner'>>,
  ) => void;
  deleteNode: (id: string) => void;
}

const NodesContext = createContext<NodesContextValue | null>(null);

export function NodesProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as MindNode[];
          if (Array.isArray(parsed)) setNodes(parsed);
        }
      } catch {
        // Corrupt storage — start fresh rather than crash.
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nodes)).catch(() => {
      // Persist failure is non-fatal; next write retries.
    });
  }, [nodes]);

  const addNode = useCallback(
    (input: { title: string; kind: NodeKind; detail?: string }): MindNode => {
      const now = new Date().toISOString();
      // Scatter around origin so entries land nicely if synced to the web canvas later.
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
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      };
      setNodes((prev) => [node, ...prev]);
      return node;
    },
    [],
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
    },
    [],
  );

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => {
      const removed = prev.find((n) => n.id === id);
      if (!removed) return prev;
      // Promote children to the deleted node's parent (matches web behavior).
      return prev
        .filter((n) => n.id !== id)
        .map((n) => (n.parentId === id ? { ...n, parentId: removed.parentId } : n));
    });
  }, []);

  const value = useMemo(
    () => ({ nodes, loading, addNode, updateNode, deleteNode }),
    [nodes, loading, addNode, updateNode, deleteNode],
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
