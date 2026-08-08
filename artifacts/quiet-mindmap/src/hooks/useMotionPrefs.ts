import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { GLASS_PANEL_BLUR, GLASS_BAR_BLUR, GLASS_INSET_BLUR, GLASS_SCRIM_BLUR } from '../lib/glass';
import { SPRING_PANEL, SPRING_BUBBLE, NO_MOTION, T_SETTLE } from '../lib/motion';

export interface MotionPrefs {
  reduced: boolean;
  panelSpring: Transition;
  bubbleSpring: Transition;
  /** Feed into `isDragging ? 'none' : prefs.settle` — never replace the ternary itself. */
  settle: string;
  blurPanel: string;
  blurBar: string;
  blurInset: string;
  blurScrim: string;
  /** How many stars StarField should render. */
  starCount: number;
}

// Module-level constants: referentially stable, so passing `prefs` down as a
// prop never breaks memoisation and no useMemo is needed at call sites.
const FULL: MotionPrefs = {
  reduced: false,
  panelSpring: SPRING_PANEL,
  bubbleSpring: SPRING_BUBBLE,
  settle: T_SETTLE,
  blurPanel: GLASS_PANEL_BLUR,
  blurBar: GLASS_BAR_BLUR,
  blurInset: GLASS_INSET_BLUR,
  blurScrim: GLASS_SCRIM_BLUR,
  starCount: 140,
};

const REDUCED: MotionPrefs = {
  reduced: true,
  panelSpring: NO_MOTION,
  bubbleSpring: NO_MOTION,
  settle: 'none',
  blurPanel: 'blur(10px) saturate(160%)',
  blurBar: 'blur(8px) saturate(160%)',
  blurInset: 'blur(6px) saturate(140%)',
  blurScrim: 'blur(1px)',
  starCount: 40,
};

/**
 * Degrades both motion and blur cost together under `prefers-reduced-motion`.
 * Reducing blur radius isn't strictly "motion", but it's the same underlying
 * intent (a quieter, cheaper page) and protects integrated-GPU machines from
 * the up-to-18 simultaneously stacked `backdrop-filter` layers this app can
 * have on screen at once.
 *
 * Uses framer-motion's own `useReducedMotion` rather than a hand-rolled
 * `matchMedia` listener — it's already a dependency and handles SSR safely.
 * Each call site here sets up its own listener (there's no app-wide
 * `MotionConfig` provider to dedupe through); that's fine at the handful of
 * singleton chrome components this is called from. NodeBubble/OrbView render
 * once per node/orb, so they receive `MotionPrefs` as a prop from
 * MindmapPage instead of calling this hook themselves.
 */
export function useMotionPrefs(): MotionPrefs {
  return useReducedMotion() ? REDUCED : FULL;
}
