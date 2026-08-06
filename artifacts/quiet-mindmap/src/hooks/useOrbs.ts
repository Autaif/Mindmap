import { useState, useCallback, useEffect, useRef } from 'react';
import type { Orb } from '../types';
import {
  loadOrbs,
  saveOrbs,
  createDefaultPrimaryOrb,
  makeOrbId,
  loadOrbAssignments,
  saveOrbAssignments,
} from '../lib/orbStore';

/**
 * Orbs are local-only, same store-scoping as attachments — not part of
 * useNodes/the sync API. A primary orb (pinned at world origin) always
 * exists; it's created on first load for a store that has none yet.
 */
export function useOrbs(storeId: string | null) {
  const [orbs, setOrbsState] = useState<Orb[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const storeIdRef = useRef(storeId);

  const [nodeOrbAssignments, setAssignmentsState] = useState<Record<string, string>>({});
  const assignmentsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    storeIdRef.current = storeId;
    if (!storeId) {
      orbsRef.current = [];
      setOrbsState([]);
      assignmentsRef.current = {};
      setAssignmentsState({});
      return;
    }
    let loaded = loadOrbs(storeId);
    if (!loaded.some((o) => o.isPrimary)) {
      loaded = [createDefaultPrimaryOrb(), ...loaded];
      saveOrbs(storeId, loaded);
    }
    orbsRef.current = loaded;
    setOrbsState(loaded);

    const assignments = loadOrbAssignments(storeId);
    assignmentsRef.current = assignments;
    setAssignmentsState(assignments);
  }, [storeId]);

  const persist = useCallback((next: Orb[]) => {
    orbsRef.current = next;
    setOrbsState(next);
    if (storeIdRef.current) saveOrbs(storeIdRef.current, next);
  }, []);

  const persistAssignments = useCallback((next: Record<string, string>) => {
    assignmentsRef.current = next;
    setAssignmentsState(next);
    if (storeIdRef.current) saveOrbAssignments(storeIdRef.current, next);
  }, []);

  const updateOrb = useCallback(
    (id: string, changes: Partial<Pick<Orb, 'name' | 'color'>>) => {
      persist(orbsRef.current.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    },
    [persist],
  );

  const addOrb = useCallback(
    (name: string, color: string) => {
      const angle = Math.random() * Math.PI * 2;
      const orb: Orb = {
        id: makeOrbId(),
        name: name.trim() || 'New orb',
        color,
        x: Math.round(Math.cos(angle) * 480),
        y: Math.round(Math.sin(angle) * 280),
        isPrimary: false,
      };
      persist([...orbsRef.current, orb]);
      return orb;
    },
    [persist],
  );

  const removeOrb = useCallback(
    (id: string) => {
      persist(orbsRef.current.filter((o) => o.id !== id || o.isPrimary));
      // Tasks that belonged to the removed orb fall back to the primary orb.
      const next = { ...assignmentsRef.current };
      let changed = false;
      for (const [nodeId, orbId] of Object.entries(next)) {
        if (orbId === id) {
          delete next[nodeId];
          changed = true;
        }
      }
      if (changed) persistAssignments(next);
    },
    [persist, persistAssignments],
  );

  const assignNodeToOrb = useCallback(
    (nodeId: string, orbId: string) => {
      persistAssignments({ ...assignmentsRef.current, [nodeId]: orbId });
    },
    [persistAssignments],
  );

  const unassignNode = useCallback(
    (nodeId: string) => {
      if (!(nodeId in assignmentsRef.current)) return;
      const next = { ...assignmentsRef.current };
      delete next[nodeId];
      persistAssignments(next);
    },
    [persistAssignments],
  );

  /** Live drag updates: state only, persisted once on pointer-up. */
  const moveOrbLive = useCallback((id: string, x: number, y: number) => {
    setOrbsState((prev) => {
      const next = prev.map((o) => (o.id === id && !o.isPrimary ? { ...o, x, y } : o));
      orbsRef.current = next;
      return next;
    });
  }, []);

  const commitOrbPosition = useCallback(() => {
    if (storeIdRef.current) saveOrbs(storeIdRef.current, orbsRef.current);
  }, []);

  return {
    orbs,
    updateOrb,
    addOrb,
    removeOrb,
    moveOrbLive,
    commitOrbPosition,
    nodeOrbAssignments,
    assignNodeToOrb,
    unassignNode,
  };
}
