/**
 * Shared design tokens: radius scale, hairline borders, elevation shadows,
 * semantic accent/danger/success/warn tints, and the z-index stacking order.
 * Pairs with `./glass` (translucent surfaces) and `./motion` (transitions).
 */

/** Roughly matches `--radius-sm`/`--radius-md`/`--radius-lg` in index.css. */
export const RADIUS_XS = 6; // count badges, icon-button hit areas
export const RADIUS_SM = 10; // inputs, buttons, chips, rows — matches --radius-md
export const RADIUS_MD = 12; // small floats: node bubble, zoom stack, notices — matches --radius
export const RADIUS_LG = 16; // large panels: digest, node-detail card
export const RADIUS_PILL = 999; // fully-rounded pill (privacy badge)
export const RADIUS_CIRCLE = '50%';

export const BORDER_W = 1;
/** Active/selected controls and dashed outlines only — 1px reads as invisible when dashed. */
export const BORDER_W_EMPHASIS = 1.5;

/** Hairline greys. Two roles: a field/divider resting state, and a standalone outlined control. */
export const BORDER_SUBTLE = 'hsl(228, 25%, 18%)'; // dividers, inputs, resting chips — matches --border
export const BORDER_CONTROL = 'hsl(228, 25%, 22%)'; // standalone outlined buttons (Orb, Cancel, …)
export const BORDER_HOVER = 'hsl(228, 25%, 30%)'; // hover target for BORDER_CONTROL

/** Ambient drop shadows. Directional ones (drawer) can't merge with the rest. */
export const SHADOW_FLOAT = '0 8px 32px rgba(0, 0, 0, 0.45)'; // floating chrome, panels, cards
export const SHADOW_POPOVER = '0 12px 40px rgba(0, 0, 0, 0.5)'; // topmost: attachment hover preview
export const SHADOW_DRAWER = '-16px 0 48px rgba(0, 0, 0, 0.35)'; // right-edge slide-in panels

/** Accent (violet) — the app's one interactive-highlight color. */
export const ACCENT_RGB = '139, 92, 246';
export const ACCENT_BG = 'rgba(139, 92, 246, 0.12)';
export const ACCENT_BORDER = 'rgba(139, 92, 246, 0.3)';
export const ACCENT_BORDER_STRONG = 'rgba(139, 92, 246, 0.5)';
export const ACCENT_UNDERLINE = 'rgba(139, 92, 246, 0.4)';
export const GLOW_ACCENT = '0 0 16px rgba(139, 92, 246, 0.35)';
export const GLOW_ACCENT_STRONG = '0 0 24px rgba(139, 92, 246, 0.5)';

/** Semantic status tints — destructive / success / stale-warning chips and buttons. */
export const DANGER_BG = 'rgba(239, 68, 68, 0.12)';
export const DANGER_BORDER = 'rgba(239, 68, 68, 0.4)';
export const SUCCESS_BG = 'rgba(52, 211, 153, 0.1)';
export const SUCCESS_BORDER = 'rgba(52, 211, 153, 0.3)';
export const WARN_BG = 'rgba(251, 191, 36, 0.08)';
export const WARN_BORDER = 'rgba(251, 191, 36, 0.35)';
export const WARN_CHIP_BG = 'rgba(251, 191, 36, 0.18)';

/** Connection line for a non-open (handled/archived) node. */
export const STROKE_MUTED = 'rgba(120, 125, 165, 0.35)';

/** One halo size for every small colored indicator dot. */
export function dotGlow(color: string): string {
  return `0 0 6px ${color}`;
}

/**
 * Every stacking decision in the app, in one readable ladder. `selected`
 * covers both a selected node and a selected orb — they never coexist.
 */
export const Z = {
  canvas: 1,
  connections: 2,
  orbPrimary: 5,
  orbSecondary: 6,
  node: 10,
  /** LandingPage's hero content — separate route/stacking context from the map, so it can't collide numerically with anything above. */
  landingContent: 5,
  privacyBadge: 20,
  emptyState: 30,
  selected: 50,
  nodeDetail: 60,
  /** Left-edge list panel. Sits beside the digest, never over it — they occupy opposite edges. */
  list: 64,
  digest: 65,
  chrome: 70, // account button, zoom stack, seed notice, clear-confirm
  filterBar: 80,
  scrim: 90,
  drawer: 100,
  hoverPreview: 200,
  /** Topmost: a full-size attachment covers everything, including a drawer. */
  lightbox: 300,
} as const;
