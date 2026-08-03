import { useState, useCallback, useEffect } from 'react';
import type { MindNode, NodeKind, NodeStatus } from '../types';

const STORAGE_KEY = 'quiet-mindmap-nodes';
const SEEDED_KEY = 'quiet-mindmap-seeded';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function radialPosition(index: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.round(cx + radius * Math.cos(angle)),
    y: Math.round(cy + radius * Math.sin(angle)),
  };
}

const SEED_NODES: Omit<MindNode, 'id' | 'createdAt' | 'updatedAt' | 'x' | 'y'>[] = [
  { title: 'Budget review delay', detail: 'Finance team said Q3 numbers won\'t be ready until next week. Need to reschedule the board meeting.', kind: 'urgent', owner: 'Finance', status: 'open' },
  { title: 'New workflow proposal from Ana', detail: 'Ana wants to restructure the onboarding flow. She has a draft doc — seems promising but needs my sign-off.', kind: 'idea', owner: 'Ana', status: 'open' },
  { title: 'Team morale after restructuring', detail: 'Several people seem unsettled. Worth a one-on-one round before the all-hands.', kind: 'concern', owner: 'Team', status: 'open' },
  { title: 'Update Q4 roadmap', detail: 'Product asked for priority changes by Friday.', kind: 'task', owner: 'Product', status: 'open' },
  { title: 'Carlos needs clearer role definition', detail: 'He mentioned feeling uncertain about scope in two different meetings. Not yet critical but worth addressing.', kind: 'concern', owner: 'Carlos', status: 'open' },
];

function createSeedNodes(cx: number, cy: number): MindNode[] {
  return SEED_NODES.map((n, i) => {
    const pos = radialPosition(i, SEED_NODES.length, 240, cx, cy);
    const now = new Date().toISOString();
    return { ...n, id: generateId(), createdAt: now, updatedAt: now, ...pos };
  });
}

export function useNodes(canvasWidth: number, canvasHeight: number) {
  const cx = Math.round(canvasWidth / 2);
  const cy = Math.round(canvasHeight / 2);

  const [nodes, setNodes] = useState<MindNode[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as MindNode[];
    } catch {}
    return [];
  });

  // Seed on first load once we know dimensions
  useEffect(() => {
    if (canvasWidth === 0 || canvasHeight === 0) return;
    const alreadySeeded = localStorage.getItem(SEEDED_KEY);
    if (!alreadySeeded) {
      const seeded = createSeedNodes(cx, cy);
      setNodes(seeded);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      localStorage.setItem(SEEDED_KEY, '1');
    }
  }, [canvasWidth > 0, canvasHeight > 0]);

  const persist = useCallback((updated: MindNode[]) => {
    setNodes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addNode = useCallback((input: { title: string; detail: string; kind: NodeKind; owner: string }) => {
    const pos = radialPosition(nodes.length, Math.max(nodes.length + 1, 6), 200 + Math.random() * 80, cx, cy);
    const now = new Date().toISOString();
    const node: MindNode = {
      id: generateId(),
      title: input.title,
      detail: input.detail,
      kind: input.kind,
      owner: input.owner,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      x: pos.x + (Math.random() - 0.5) * 60,
      y: pos.y + (Math.random() - 0.5) * 60,
    };
    persist([...nodes, node]);
    return node;
  }, [nodes, cx, cy, persist]);

  const updateNode = useCallback((id: string, changes: Partial<MindNode>) => {
    persist(nodes.map(n => n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n));
  }, [nodes, persist]);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, x, y } : n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteNode = useCallback((id: string) => {
    persist(nodes.filter(n => n.id !== id));
  }, [nodes, persist]);

  const clearSeedNodes = useCallback(() => {
    persist([]);
    localStorage.removeItem(SEEDED_KEY);
    localStorage.setItem(SEEDED_KEY, 'cleared');
  }, [persist]);

  return { nodes, addNode, updateNode, moveNode, deleteNode, clearSeedNodes };
}
