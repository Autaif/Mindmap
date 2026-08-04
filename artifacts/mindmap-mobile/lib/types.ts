export type NodeKind = 'concern' | 'idea' | 'urgent' | 'task';
export type NodeStatus = 'open' | 'handled' | 'archived';

export interface MindNode {
  id: string;
  title: string;
  detail: string;
  kind: NodeKind;
  owner: string;
  status: NodeStatus;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  /** World-space coordinates on the web canvas. Kept for future sync. */
  x: number;
  y: number;
}

export const KIND_ORDER: NodeKind[] = ['urgent', 'concern', 'idea', 'task'];

export const KIND_META: Record<
  NodeKind,
  { label: string; color: string; bg: string; border: string }
> = {
  urgent: {
    label: 'Urgent',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.55)',
  },
  concern: {
    label: 'Concern',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.5)',
  },
  idea: {
    label: 'Idea',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.5)',
  },
  task: {
    label: 'Task',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.5)',
  },
};

export const STATUS_META: Record<NodeStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#e2e8f0' },
  handled: { label: 'Handled', color: '#34d399' },
  archived: { label: 'Archived', color: '#8b93ab' },
};

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
