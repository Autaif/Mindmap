import { hexToRgba } from './lib/color';

export type NodeKind = 'concern' | 'idea' | 'urgent' | 'task';
export type NodeStatus = 'open' | 'handled' | 'archived';

export type AttachmentKind = 'image' | 'file' | 'link';

/**
 * Attachments are local-only: metadata lives in localStorage, file/image
 * bytes live in IndexedDB (`../lib/attachmentStore`), keyed by `id`. They are
 * never sent to the sync API — `nodeId` links them to a MindNode by id only.
 */
export interface Attachment {
  id: string;
  nodeId: string;
  kind: AttachmentKind;
  name: string;
  mimeType?: string;
  /** Byte size for image/file kinds; absent for links. */
  size?: number;
  /** Target URL for kind 'link'. */
  url?: string;
  /**
   * A file shipped with the app rather than uploaded by the user, served from
   * `public/`. Demo content uses this so the seeded pictures survive a fresh
   * browser, a deployed build, and a different machine — none of which have
   * anything in this browser's IndexedDB.
   */
  assetUrl?: string;
  createdAt: string;
}

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

/**
 * A hub on the map. The primary orb is pinned at world origin (0, 0) — the
 * point node radial-positioning and connection-line fallbacks are built
 * around — so only its name/color are editable. Secondary orbs are purely
 * organisational landmarks: freely positioned, no effect on node geometry.
 */
export interface Orb {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  isPrimary: boolean;
}

export const ORB_COLOR_SWATCHES = [
  '#8b5cf6', // violet (default)
  '#60a5fa', // blue
  '#34d399', // green
  '#f97316', // orange
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#facc15', // yellow
  '#f87171', // red
];

export const DEFAULT_ORB_COLOR = ORB_COLOR_SWATCHES[0];

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.5;

export const KIND_META: Record<NodeKind, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#f97316' },
  concern: { label: 'Concern', color: '#a78bfa' },
  idea: { label: 'Idea', color: '#34d399' },
  task: { label: 'Task', color: '#60a5fa' },
};

/**
 * Named alpha roles for a kind's tint, derived from `KIND_META[kind].color`
 * instead of being pre-baked per kind — replaces the `.replace('0.45)', …)`
 * string surgery that used to re-alpha a fixed rgba string at each call site.
 */
export type KindTintRole = 'bg' | 'bgActive' | 'border' | 'glow' | 'glowSoft' | 'ring';

const TINT_ALPHA: Record<KindTintRole, number> = {
  bg: 0.1, // resting bubble fill, active filter chip, active kind picker
  bgActive: 0.22, // selected bubble fill
  border: 0.5, // bubble border, connection stroke, detail-card border
  glow: 0.45, // selected bubble outer halo
  glowSoft: 0.18, // resting bubble halo, detail-card halo
  ring: 0.22, // 3px selection ring
};

/** Urgent is deliberately the loudest kind: every tint role is 20% more opaque than the others. */
const KIND_INTENSITY: Record<NodeKind, number> = { urgent: 1.2, concern: 1, idea: 1, task: 1 };

const KIND_TINTS: Record<NodeKind, Record<KindTintRole, string>> = Object.fromEntries(
  (Object.keys(KIND_META) as NodeKind[]).map((kind) => [
    kind,
    Object.fromEntries(
      (Object.keys(TINT_ALPHA) as KindTintRole[]).map((role) => [
        role,
        hexToRgba(KIND_META[kind].color, TINT_ALPHA[role] * KIND_INTENSITY[kind]),
      ]),
    ) as Record<KindTintRole, string>,
  ]),
) as Record<NodeKind, Record<KindTintRole, string>>;

export function kindTint(kind: NodeKind, role: KindTintRole): string {
  return KIND_TINTS[kind][role];
}

export function clampScale(scale: number) {
  // Guard non-finite input explicitly: Math.min/max propagate NaN rather than
  // clamping it, and a NaN scale reaches the DOM as `transform: … scale(NaN)`,
  // which browsers reject as an invalid declaration and drop *in full* — taking
  // the translate with it. Pan, zoom, drag and connection-line alignment all
  // die together, silently and with no console error. Fall back to 1:1.
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
