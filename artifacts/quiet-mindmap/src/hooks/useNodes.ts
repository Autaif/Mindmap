import { useState, useCallback, useEffect, useRef } from 'react';
import type { MindNode, NodeKind } from '../types';

const STORAGE_KEY = 'quiet-mindmap-nodes';
const SEEDED_KEY = 'quiet-mindmap-seeded';

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

type SeedSpec = Omit<MindNode, 'id' | 'createdAt' | 'updatedAt' | 'x' | 'y' | 'parentId'> & {
  children?: Omit<MindNode, 'id' | 'createdAt' | 'updatedAt' | 'x' | 'y' | 'parentId'>[];
};

const SEED_NODES: SeedSpec[] = [
  {
    title: 'Budget review delay',
    detail: "Finance said Q3 numbers won't be ready until next week. Need to reschedule the board meeting.",
    kind: 'urgent',
    owner: 'Finance',
    status: 'open',
    children: [
      { title: 'Reschedule board meeting', detail: 'Find a slot after the numbers land.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  {
    title: 'New workflow proposal from Ana',
    detail: 'Ana wants to restructure onboarding. She has a draft doc — promising, needs my sign-off.',
    kind: 'idea',
    owner: 'Ana',
    status: 'open',
  },
  {
    title: 'Team morale after restructuring',
    detail: 'Several people seem unsettled. Worth a one-on-one round before the all-hands.',
    kind: 'concern',
    owner: 'Team',
    status: 'open',
    children: [
      { title: 'One-on-one round', detail: 'Start with the people closest to the change.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  { title: 'Update Q4 roadmap', detail: 'Product asked for priority changes by Friday.', kind: 'task', owner: 'Product', status: 'open' },
  {
    title: 'Carlos needs clearer role definition',
    detail: 'He mentioned feeling uncertain about scope in two meetings. Not critical yet, but worth addressing.',
    kind: 'concern',
    owner: 'Carlos',
    status: 'open',
  },
];

function createSeedNodes(): MindNode[] {
  const now = new Date().toISOString();
  const out: MindNode[] = [];

  SEED_NODES.forEach((spec, i) => {
    const { children, ...rest } = spec;
    const pos = radialPosition(i, SEED_NODES.length);
    const parentId = generateId();
    out.push({ ...rest, id: parentId, parentId: null, createdAt: now, updatedAt: now, ...pos });

    (children ?? []).forEach((child, ci) => {
      // Push the child further out along the same direction as its parent.
      const len = Math.hypot(pos.x, pos.y) || 1;
      const ux = pos.x / len;
      const uy = pos.y / len;
      const spread = (ci - ((children!.length - 1) / 2)) * 90;
      out.push({
        ...child,
        id: generateId(),
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

function loadStored(): MindNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MindNode[];
  } catch {
    return [];
  }
}

export function useNodes(canvasWidth: number, canvasHeight: number) {
  const [nodes, setNodes] = useState<MindNode[]>(() => loadStored());
  const initialized = useRef(false);

  // One-time setup once the canvas has real dimensions: seed a fresh map, or
  // migrate legacy entries that stored screen coordinates and had no parent.
  useEffect(() => {
    if (initialized.current) return;
    if (canvasWidth === 0 || canvasHeight === 0) return;
    initialized.current = true;

    const stored = loadStored();

    if (stored.length === 0) {
      if (!localStorage.getItem(SEEDED_KEY)) {
        const seeded = createSeedNodes();
        setNodes(seeded);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        localStorage.setItem(SEEDED_KEY, '1');
      }
      return;
    }

    const needsMigration = stored.some((n) => n.parentId === undefined);
    if (needsMigration) {
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const migrated = stored.map((n) =>
        n.parentId === undefined
          ? { ...n, parentId: null, x: Math.round(n.x - cx), y: Math.round(n.y - cy) }
          : n,
      );
      setNodes(migrated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
  }, [canvasWidth, canvasHeight]);

  const persist = useCallback((updater: (prev: MindNode[]) => MindNode[]) => {
    setNodes((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addNode = useCallback(
    (input: { title: string; detail: string; kind: NodeKind; owner: string; parentId?: string | null }) => {
      const parentId = input.parentId ?? null;
      const now = new Date().toISOString();
      const id = generateId();

      let x: number;
      let y: number;

      const parent = parentId ? nodes.find((n) => n.id === parentId) : undefined;
      if (parent) {
        const siblings = nodes.filter((n) => n.parentId === parentId).length;
        const len = Math.hypot(parent.x, parent.y) || 1;
        const ux = parent.x / len;
        const uy = parent.y / len;
        const spread = (siblings - 1) * 55 - 40;
        x = Math.round(parent.x + ux * (CHILD_OFFSET + 15) - uy * spread);
        y = Math.round(parent.y + uy * (CHILD_OFFSET + 15) + ux * spread);
      } else {
        const roots = nodes.filter((n) => n.parentId === null).length;
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

      persist((prev) => [...prev, node]);
      return node;
    },
    [nodes, persist],
  );

  const updateNode = useCallback(
    (id: string, changes: Partial<MindNode>) => {
      persist((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n)),
      );
    },
    [persist],
  );

  /** Live drag updates: state only, so connection lines follow in real time. */
  const moveNodeLive = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  /** Called once on pointer-up so we write to storage a single time per drag. */
  const commitPositions = useCallback(() => {
    setNodes((prev) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
      return prev;
    });
  }, []);

  /** Removing a node promotes its children to the removed node's own parent. */
  const deleteNode = useCallback(
    (id: string) => {
      persist((prev) => {
        const target = prev.find((n) => n.id === id);
        const newParent = target?.parentId ?? null;
        return prev
          .filter((n) => n.id !== id)
          .map((n) => (n.parentId === id ? { ...n, parentId: newParent } : n));
      });
    },
    [persist],
  );

  const clearAllNodes = useCallback(() => {
    persist(() => []);
    localStorage.setItem(SEEDED_KEY, 'cleared');
  }, [persist]);

  return { nodes, addNode, updateNode, moveNodeLive, commitPositions, deleteNode, clearAllNodes };
}
