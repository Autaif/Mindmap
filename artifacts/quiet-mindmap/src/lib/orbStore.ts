import type { Orb } from '../types';
import { DEFAULT_ORB_COLOR } from '../types';

const PRIMARY_ORB_ID = 'primary';

function orbsKey(storeId: string) {
  return `quiet-mindmap-orbs:${storeId}`;
}

function assignmentsKey(storeId: string) {
  return `quiet-mindmap-orb-assignments:${storeId}`;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeOrbId() {
  return generateId();
}

export function createDefaultPrimaryOrb(): Orb {
  return { id: PRIMARY_ORB_ID, name: 'Work', color: DEFAULT_ORB_COLOR, x: 0, y: 0, isPrimary: true };
}

export function loadOrbs(storeId: string): Orb[] {
  try {
    const raw = localStorage.getItem(orbsKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Orb[]) : [];
  } catch {
    return [];
  }
}

export function saveOrbs(storeId: string, orbs: Orb[]) {
  localStorage.setItem(orbsKey(storeId), JSON.stringify(orbs));
}

/**
 * Which orb a *root* task (parentId === null) belongs to. Local-only, keyed
 * by nodeId → orbId; a node absent here anchors to the primary orb (world
 * origin), same as before this feature existed. Sub-items don't need an
 * entry — they anchor to their parent node, not an orb.
 */
export function loadOrbAssignments(storeId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(assignmentsKey(storeId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveOrbAssignments(storeId: string, assignments: Record<string, string>) {
  localStorage.setItem(assignmentsKey(storeId), JSON.stringify(assignments));
}
