import { useState, useEffect, useCallback, useRef } from 'react';
import { loadSticks, saveSticks, followersOf, rootAnchorOf, type StickMap } from '../lib/stick';

/**
 * Which entries are stuck to which. Local-only and store-scoped, exactly like
 * orb assignments — never part of the sync payload.
 */
export function useStick(storeId: string | null) {
  const [sticks, setSticksState] = useState<StickMap>({});
  const sticksRef = useRef<StickMap>({});
  const storeIdRef = useRef(storeId);

  useEffect(() => {
    storeIdRef.current = storeId;
    const loaded = storeId ? loadSticks(storeId) : {};
    sticksRef.current = loaded;
    setSticksState(loaded);
  }, [storeId]);

  const persist = useCallback((next: StickMap) => {
    sticksRef.current = next;
    setSticksState(next);
    if (storeIdRef.current) saveSticks(storeIdRef.current, next);
  }, []);

  const stick = useCallback(
    (followerId: string, anchorId: string) => {
      if (followerId === anchorId) return;
      // Refuse a loop: the anchor must not already hang off the follower.
      if (rootAnchorOf(sticksRef.current, anchorId) === followerId) return;
      persist({ ...sticksRef.current, [followerId]: anchorId });
    },
    [persist],
  );

  const unstick = useCallback(
    (followerId: string) => {
      if (!(followerId in sticksRef.current)) return;
      const next = { ...sticksRef.current };
      delete next[followerId];
      persist(next);
    },
    [persist],
  );

  /** Called when an entry is removed, so nothing hangs off a ghost. */
  const forgetNode = useCallback(
    (id: string) => {
      const current = sticksRef.current;
      const anchor = current[id];
      const next: StickMap = {};
      let changed = false;
      for (const [follower, target] of Object.entries(current)) {
        if (follower === id) {
          changed = true;
          continue;
        }
        if (target === id) {
          // Promote: whatever was stuck to the removed entry joins its anchor,
          // rather than being silently cut loose in place.
          changed = true;
          if (anchor) next[follower] = anchor;
          continue;
        }
        next[follower] = target;
      }
      if (changed) persist(next);
    },
    [persist],
  );

  /** Read the live value without waiting for a re-render (used mid-drag). */
  const currentSticks = useCallback(() => sticksRef.current, []);

  const followers = useCallback((id: string) => followersOf(sticksRef.current, id), []);

  return { sticks, stick, unstick, forgetNode, followers, currentSticks };
}
