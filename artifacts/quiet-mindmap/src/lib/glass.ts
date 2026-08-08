/**
 * Shared glassmorphism tokens: translucent panels with a blurred, saturated
 * backdrop and a faint top sheen, replacing the flat opaque cards that used
 * to sit on solid `hsl(228,32%,10%)` backgrounds.
 *
 * Four surface tiers, from tiniest blur to strongest:
 *   scrim  — full-screen dim behind a drawer (`glassScrim`)
 *   inset  — nested surfaces: rows, inputs, chips, node bubbles
 *   bar    — floating chrome: top bar, zoom stack, badges, notices
 *   panel  — large surfaces: drawers, digest, detail card, hover preview
 *
 * Reach for `glassSurface(tier, options)` / `glassScrim()` over the raw
 * constants below — they also guarantee the WebkitBackdropFilter prefix,
 * which is easy to forget by hand.
 */

import { BORDER_W } from './tokens';

/* ---- Base fills ---------------------------------------------------------
   One navy for every translucent surface. rgb(13,15,33) is a hair bluer
   than the page background (hsl(228,35%,8%) ≈ rgb(13,16,28)) — same family,
   deliberately. */
export const GLASS_NAVY_RGB = '13, 15, 33';
export const GLASS_SCRIM_BG = 'rgba(13, 15, 33, 0.55)';
export const GLASS_NAVY_FILL = 'rgba(13, 15, 33, 0.6)';
export const GLASS_NOTICE_BG = 'rgba(13, 15, 33, 0.85)';

/* ---- White veil — faint chips, hover rows, icon squares. ---------------- */
export const GLASS_VEIL = 'rgba(255, 255, 255, 0.05)';
export const GLASS_VEIL_HOVER = 'rgba(255, 255, 255, 0.08)';

const SHEEN_STRONG = 'rgba(255, 255, 255, 0.06)'; // panel gradient top stop
const SHEEN_SOFT = 'rgba(255, 255, 255, 0.045)'; // inset gradient top stop

/* ---- Border --------------------------------------------------------------- */
export const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.09)';
export const GLASS_BORDER = `${BORDER_W}px solid ${GLASS_BORDER_COLOR}`;

/* ---- Blur tiers ----------------------------------------------------------- */
/** Drawer scrims. Deliberately tiny — never fold into a bigger tier, or the whole map turns to mush. */
export const GLASS_SCRIM_BLUR = 'blur(2px)';
/** Nested surfaces + node bubbles (the highest-count backdrop layer, so kept cheap). */
export const GLASS_INSET_BLUR = 'blur(10px) saturate(140%)';
/** Floating chrome: top bar, zoom stack, badges, notices. */
export const GLASS_BAR_BLUR = 'blur(14px) saturate(160%)';
/** Large surfaces: drawers, digest, detail card, hover preview. */
export const GLASS_PANEL_BLUR = 'blur(22px) saturate(160%)';

/* ---- Backgrounds ------------------------------------------------------- */
export const GLASS_PANEL_BG = `linear-gradient(165deg, ${SHEEN_STRONG}, rgba(255,255,255,0) 45%), ${GLASS_NAVY_FILL}`;
export const GLASS_INSET_BG = `linear-gradient(165deg, ${SHEEN_SOFT}, rgba(255,255,255,0) 55%), ${GLASS_VEIL}`;
/** Flat, no sheen — keeps small chrome visually distinct from a full panel. */
export const GLASS_BAR_BG = GLASS_NAVY_FILL;
/** The top filter bar fades out downward instead of ending on a border/edge. */
export const GLASS_TOPBAR_BG = `linear-gradient(to bottom, ${GLASS_NOTICE_BG} 60%, transparent)`;

/* ---- Helpers ------------------------------------------------------------ */

export interface BackdropStyle {
  backdropFilter: string;
  WebkitBackdropFilter: string;
}

/** Always emits both prefixes — the thing hand-written styles kept forgetting. */
export function backdrop(blur: string): BackdropStyle {
  return { backdropFilter: blur, WebkitBackdropFilter: blur };
}

export type GlassTier = 'panel' | 'bar' | 'inset' | 'notice';

export interface GlassOptions {
  /** Override the tier blur — feed the degraded value from useMotionPrefs(). */
  blur?: string;
  /** Override the tier fill, e.g. GLASS_TOPBAR_BG. */
  background?: string;
  /** Override or drop ('none') the border — drawers set their own borderLeft instead. */
  border?: string;
  radius?: number | string;
  shadow?: string;
}

/** Narrow on purpose (not React.CSSProperties) to avoid variance friction when spread into framer-motion's MotionStyle. */
export interface GlassStyle extends BackdropStyle {
  background: string;
  border: string;
  borderRadius?: number | string;
  boxShadow?: string;
}

const TIER_BG: Record<GlassTier, string> = {
  panel: GLASS_PANEL_BG,
  bar: GLASS_BAR_BG,
  inset: GLASS_INSET_BG,
  notice: GLASS_NOTICE_BG,
};

const TIER_BLUR: Record<GlassTier, string> = {
  panel: GLASS_PANEL_BLUR,
  bar: GLASS_BAR_BLUR,
  inset: GLASS_INSET_BLUR,
  notice: GLASS_BAR_BLUR,
};

/**
 * Spread this into a style object for any glass surface:
 * `style={{ ...glassSurface('panel', { radius: RADIUS_LG, shadow: SHADOW_FLOAT }), position: 'fixed', … }}`
 */
export function glassSurface(tier: GlassTier, options: GlassOptions = {}): GlassStyle {
  return {
    background: options.background ?? TIER_BG[tier],
    border: options.border ?? GLASS_BORDER,
    borderRadius: options.radius,
    boxShadow: options.shadow,
    ...backdrop(options.blur ?? TIER_BLUR[tier]),
  };
}

/** Full-screen dim behind a drawer. Paint only — caller sets position/inset/zIndex. */
export function glassScrim(blur: string = GLASS_SCRIM_BLUR): BackdropStyle & { background: string } {
  return { background: GLASS_SCRIM_BG, ...backdrop(blur) };
}
