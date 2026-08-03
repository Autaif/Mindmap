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
  /** World-space coordinates. The focus orb sits at world origin (0, 0). */
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.5;

export const KIND_META: Record<
  NodeKind,
  { label: string; color: string; glow: string; border: string; bg: string }
> = {
  urgent: {
    label: 'Urgent',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.5)',
    border: 'rgba(249,115,22,0.6)',
    bg: 'rgba(249,115,22,0.12)',
  },
  concern: {
    label: 'Concern',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.45)',
    border: 'rgba(167,139,250,0.5)',
    bg: 'rgba(167,139,250,0.1)',
  },
  idea: {
    label: 'Idea',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.45)',
    border: 'rgba(52,211,153,0.5)',
    bg: 'rgba(52,211,153,0.1)',
  },
  task: {
    label: 'Task',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.45)',
    border: 'rgba(96,165,250,0.5)',
    bg: 'rgba(96,165,250,0.1)',
  },
};

export function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
