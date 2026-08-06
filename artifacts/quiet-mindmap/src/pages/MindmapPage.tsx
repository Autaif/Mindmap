import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StarField } from '../components/StarField';
import { NodeBubble } from '../components/NodeBubble';
import { NodePanel, type SharePanelProps } from '../components/NodePanel';
import { OrbView } from '../components/OrbView';
import { OrbPanel } from '../components/OrbPanel';
import { FilterBar } from '../components/FilterBar';
import { DigestPanel, getStaleOpenNodes, useWeeklyDigestNotification } from '../components/DigestPanel';
import { ListPanel, LIST_PANEL_SPACE } from '../components/ListPanel';
import { ZoomControls } from '../components/ZoomControls';
import { useUser, useAuthActions } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { type SyncStatus } from '../hooks/useNodes';
import { useMap } from '../hooks/useMap';
import { useStick } from '../hooks/useStick';
import { findStickTarget, slotPosition, RELEASE_DISTANCE } from '../lib/stick';
import { useAttachments } from '../hooks/useAttachments';
import { useOrbs } from '../hooks/useOrbs';
import type { Attachment, MindNode, NodeKind, NodeStatus, Orb, Viewport } from '../types';
import { KIND_META, clampScale, kindTint } from '../types';
import { guestStoreId, persona, isPersonaMode, personaNameFor } from '../lib/persona';
import { partnerOf, accountName } from '../lib/supabase';
import { glassSurface } from '../lib/glass';
import {
  RADIUS_SM, RADIUS_MD, RADIUS_LG, RADIUS_XS, RADIUS_PILL, BORDER_W, BORDER_W_EMPHASIS, BORDER_CONTROL, SHADOW_FLOAT,
  ACCENT_BG, ACCENT_BORDER, ACCENT_BORDER_STRONG, ACCENT_UNDERLINE, SUCCESS_BG, SUCCESS_BORDER,
  DANGER_BG, DANGER_BORDER, STROKE_MUTED, dotGlow, Z,
} from '../lib/tokens';
import { T_COLOR } from '../lib/motion';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';
import { computePushOffsets, ZERO_PUSH, type RepelPoint } from '../lib/repulsion';

const EMPTY_ATTACHMENTS: Attachment[] = [];

const DISMISS_KEY = 'quiet-mindmap-seed-notice-dismissed';

const SYNC_LABEL: Record<SyncStatus, string> = {
  synced: 'Private to your account · synced',
  syncing: 'Private to your account · syncing…',
  offline: 'Offline — changes saved, will sync when back online',
  error: 'Sync paused — retrying',
  local: 'Saved on this device only · sign in to sync',
};

function PrivacyBadge({ status }: { status: SyncStatus }) {
  const prefs = useMotionPrefs();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        fontSize: 11,
        color: 'hsl(220,15%,45%)',
        fontWeight: 500,
        zIndex: Z.privacyBadge,
        userSelect: 'none',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        ...glassSurface('bar', { radius: RADIUS_PILL, blur: prefs.blurBar }),
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1.5" y="4.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.5 4.5V3a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {SYNC_LABEL[status]}
    </motion.div>
  );
}

/**
 * Whose map this window is, shown only in the two-person demo. Without it the
 * two windows are indistinguishable at a glance, which is precisely the thing
 * the demo needs to make obvious.
 */
function PersonaBadge({ label }: { label: string }) {
  const prefs = useMotionPrefs();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        position: 'fixed',
        top: 18,
        left: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 13px',
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'hsl(262,65%,76%)',
        zIndex: Z.chrome,
        userSelect: 'none',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        ...glassSurface('bar', { radius: RADIUS_PILL, blur: prefs.blurBar, border: `${BORDER_W}px solid ${ACCENT_BORDER}` }),
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'hsl(262,60%,65%)',
          boxShadow: dotGlow('hsl(262,60%,65%)'),
        }}
      />
      {label}
    </motion.div>
  );
}

/**
 * Signed in: offers sign out. Signed out: offers the way back to the private,
 * synced map — the only route to it once the sign-in wall is off.
 */
function AccountButton() {
  const { signOut } = useAuthActions();
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const prefs = useMotionPrefs();

  const signedIn = !!isSignedIn;

  return (
    <button
      type="button"
      onClick={() => {
        if (signedIn) void signOut();
        else setLocation('/sign-in');
      }}
      style={{
        // Bottom-left is the only free corner: the filter bar owns the top row,
        // the zoom controls the bottom-right, the privacy badge the centre.
        position: 'fixed',
        bottom: 18,
        left: 18,
        zIndex: Z.chrome,
        padding: '6px 13px',
        color: signedIn ? 'hsl(220,15%,55%)' : 'hsl(262,65%,76%)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        ...glassSurface('bar', {
          radius: RADIUS_SM,
          background: signedIn ? undefined : ACCENT_BG,
          border: signedIn ? undefined : `${BORDER_W}px solid ${ACCENT_BORDER_STRONG}`,
          blur: prefs.blurBar,
        }),
      }}
    >
      {signedIn ? 'Sign out' : 'Sign in to sync'}
    </button>
  );
}

/**
 * Lines are drawn in the same transformed world space as the nodes, so they
 * track live while a node is dragged and stay correct at any zoom level.
 */
function ConnectionLines({
  nodes,
  visibleIds,
  orbs,
  nodeOrbAssignments,
}: {
  nodes: MindNode[];
  visibleIds: Set<string>;
  orbs: Orb[];
  nodeOrbAssignments: Record<string, string>;
}) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const orbById = useMemo(() => new Map(orbs.map((o) => [o.id, o])), [orbs]);

  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: Z.connections }}
    >
      {nodes
        .filter((n) => visibleIds.has(n.id))
        .map((n) => {
          const meta = KIND_META[n.kind];
          const faded = n.status !== 'open';

          // Attach to the nearest visible ancestor node, if any.
          let anchorX = 0;
          let anchorY = 0;
          let anchoredToAncestor = false;
          let cursor = n.parentId ? byId.get(n.parentId) : undefined;
          const guard = new Set<string>();
          while (cursor && !guard.has(cursor.id)) {
            guard.add(cursor.id);
            if (visibleIds.has(cursor.id)) {
              anchorX = cursor.x;
              anchorY = cursor.y;
              anchoredToAncestor = true;
              break;
            }
            cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
          }

          // Otherwise, root tasks anchor to their assigned orb (primary orb
          // sits at world origin, so (0, 0) is still the default fallback).
          if (!anchoredToAncestor && n.parentId === null) {
            const orb = orbById.get(nodeOrbAssignments[n.id] ?? '');
            if (orb) {
              anchorX = orb.x;
              anchorY = orb.y;
            }
          }

          const isSubLink = anchoredToAncestor;

          return (
            <line
              key={n.id}
              // The class (not an inline `animation` style) is what lets the
              // prefers-reduced-motion media query in index.css freeze this —
              // an inline animation would win over the query regardless.
              className="orbit-line"
              x1={anchorX}
              y1={anchorY}
              x2={n.x}
              y2={n.y}
              stroke={faded ? STROKE_MUTED : kindTint(n.kind, 'border')}
              strokeWidth={isSubLink ? 1.5 : 1}
              strokeDasharray={isSubLink ? '2 5' : '4 8'}
              opacity={faded ? 0.3 : isSubLink ? 0.7 : 0.55}
            />
          );
        })}
    </svg>
  );
}

function EmptyState({ onAdd, filtered }: { onAdd: () => void; filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: Z.emptyState,
        pointerEvents: 'none',
        marginTop: 70,
      }}
    >
      <p style={{ fontSize: 13, color: 'hsl(220,15%,42%)', margin: 0, fontWeight: 500, maxWidth: 240, lineHeight: 1.6 }}>
        {filtered ? (
          'Nothing matches these filters.'
        ) : (
          <>
            Your map is clear.
            <br />
            <span
              onClick={onAdd}
              style={{
                color: 'hsl(262,60%,65%)',
                cursor: 'pointer',
                pointerEvents: 'all',
                textDecoration: 'underline',
                textDecorationColor: ACCENT_UNDERLINE,
              }}
            >
              Add your first entry
            </span>{' '}
            to begin.
          </>
        )}
      </p>
    </motion.div>
  );
}

const nodeDetailCloseHover = hoverStyle({ color: 'hsl(220,20%,75%)' });

function NodeDetail({
  node,
  parent,
  childCount,
  onEdit,
  onAddChild,
  onClose,
  onStatusChange,
  share,
}: {
  node: MindNode;
  parent: MindNode | null;
  childCount: number;
  onEdit: () => void;
  onAddChild: () => void;
  onClose: () => void;
  onStatusChange: (id: string, s: NodeStatus) => void;
  share: SharePanelProps | null;
}) {
  const meta = KIND_META[node.kind];
  const date = new Date(node.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const prefs = useMotionPrefs();

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={prefs.panelSpring}
      style={{
        position: 'fixed',
        bottom: 62,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(500px, calc(100vw - 40px))',
        padding: '18px 22px',
        zIndex: Z.nodeDetail,
        ...glassSurface('panel', {
          radius: RADIUS_LG,
          border: `${BORDER_W}px solid ${kindTint(node.kind, 'border')}`,
          shadow: `0 0 40px ${kindTint(node.kind, 'glowSoft')}, ${SHADOW_FLOAT}`,
          blur: prefs.blurPanel,
        }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, boxShadow: dotGlow(meta.color), marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {parent && (
            <p style={{ margin: '0 0 3px', fontSize: 11, color: 'hsl(220,15%,42%)', fontWeight: 500 }}>
              sub-item of <span style={{ color: 'hsl(220,15%,60%)' }}>{parent.title}</span>
            </p>
          )}
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'hsl(220,20%,92%)', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
            {node.title}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {node.owner && <span style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{node.owner}</span>}
            <span style={{ fontSize: 11, color: 'hsl(220,15%,42%)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
            <span style={{ fontSize: 11, color: 'hsl(220,15%,38%)', fontWeight: 500 }}>{date}</span>
            {childCount > 0 && (
              <span style={{ fontSize: 11, color: 'hsl(220,15%,50%)', fontWeight: 600, background: 'rgba(255,255,255,0.05)', borderRadius: RADIUS_XS, padding: '1px 6px' }}>
                {childCount} sub-item{childCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,45%)', padding: 4, borderRadius: RADIUS_XS, flexShrink: 0, transition: T_COLOR }}
          {...nodeDetailCloseHover}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {node.detail && (
        <p style={{ margin: '0 0 14px 18px', fontSize: 13, color: 'hsl(220,15%,58%)', lineHeight: 1.65 }}>{node.detail}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginLeft: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {node.status !== 'handled' && (
          <button
            onClick={() => onStatusChange(node.id, 'handled')}
            style={{
              padding: '7px 14px',
              borderRadius: RADIUS_SM,
              border: `${BORDER_W}px solid ${SUCCESS_BORDER}`,
              background: SUCCESS_BG,
              color: '#34d399',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark handled
          </button>
        )}
        {node.status === 'handled' && (
          <button
            onClick={() => onStatusChange(node.id, 'open')}
            style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Reopen
          </button>
        )}

        <button
          onClick={onAddChild}
          style={{
            padding: '7px 14px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W}px solid ${ACCENT_BORDER}`,
            background: ACCENT_BG,
            color: 'hsl(262,65%,74%)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Sub-item
        </button>

        {node.status !== 'archived' && (
          <button
            onClick={() => onStatusChange(node.id, 'archived')}
            style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,45%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Archive
          </button>
        )}
        {node.status === 'archived' && (
          <button
            onClick={() => onStatusChange(node.id, 'open')}
            style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Restore
          </button>
        )}

        {/* The demo's headline move, so it sits one click from the map rather
            than behind Edit. Both people get the same controls: send what is
            yours, hand back what is not. */}
        {share && !share.isShared && (
          <button
            onClick={share.onSend}
            style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W_EMPHASIS}px solid ${ACCENT_BORDER_STRONG}`, background: ACCENT_BG, color: 'hsl(262,75%,78%)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Send to {share.partnerName}
          </button>
        )}

        {share && share.isShared && (
          <button
            onClick={share.isOwner ? share.onTakeBack : share.onReturn}
            title={share.isOwner ? 'Take it off their map' : 'Hand it back to them'}
            style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,55%)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 6h-8M5.5 2.5L2 6l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {share.isOwner ? 'Take it back' : `Return to ${share.partnerName}`}
          </button>
        )}

        <button
          onClick={onEdit}
          style={{ padding: '7px 14px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Edit
        </button>
      </div>
    </motion.div>
  );
}

export function MindmapPage() {
  // Called once here; passed down to NodeBubble/OrbView as a prop since those
  // render once per node/orb and shouldn't each open their own listener.
  const motionPrefs = useMotionPrefs();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const viewInitialized = useRef(false);

  useEffect(() => {
    const update = () => {
      if (!canvasRef.current) return;
      const r = canvasRef.current.getBoundingClientRect();
      setDimensions({ w: r.width, h: r.height });
      if (!viewInitialized.current && r.width > 0) {
        viewInitialized.current = true;
        setView({ x: r.width / 2, y: r.height / 2, scale: 1 });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Attachments and orbs are local-only (IndexedDB / localStorage), scoped to
  // the same guest/account identity as nodes, but deliberately kept out of
  // useNodes' sync payload.
  const { isLoaded, user } = useUser();
  const localStoreId = isLoaded ? (user?.id ?? guestStoreId()) : null;

  const {
    nodes,
    addNode,
    updateNode,
    moveNodeLive,
    commitPositions,
    deleteNode,
    clearAllNodes,
    syncStatus,
    sharedIds,
    sharedAttachments,
    shareInfo,
    shareNode,
    syncSharedAttachments,
    unshareNode,
    returnNode,
    isOwnerOf,
  } = useMap(dimensions.w, dimensions.h, localStoreId);
  const {
    attachments,
    addFileAttachment,
    addLinkAttachment,
    removeAttachment,
    removeAttachmentsForNode,
    refreshAttachments,
  } = useAttachments(localStoreId);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  /**
   * Own attachments plus those riding along with shared items. Deduplicated by
   * id because the sender holds both copies: their own record, and the one
   * published on the shared item.
   */
  const visibleAttachments = useMemo(() => {
    const byId = new Map<string, Attachment>();
    for (const a of attachments) byId.set(a.id, a);
    for (const a of sharedAttachments) if (!byId.has(a.id)) byId.set(a.id, a);
    return [...byId.values()];
  }, [attachments, sharedAttachments]);

  const attachmentsByNode = useMemo(() => {
    const byNode = new Map<string, Attachment[]>();
    visibleAttachments.forEach((a) => {
      const arr = byNode.get(a.nodeId);
      if (arr) arr.push(a);
      else byNode.set(a.nodeId, [a]);
    });
    return byNode;
  }, [visibleAttachments]);

  const {
    orbs,
    updateOrb,
    addOrb,
    removeOrb,
    moveOrbLive,
    commitOrbPosition,
    nodeOrbAssignments,
    assignNodeToOrb,
    unassignNode,
  } = useOrbs(localStoreId);
  const [selectedOrbId, setSelectedOrbId] = useState<string | null>(null);
  const [orbPanelMode, setOrbPanelMode] = useState<'add' | 'edit' | null>(null);
  const selectedOrb = orbs.find((o) => o.id === selectedOrbId) ?? null;

  const { sticks, stick, unstick, forgetNode, followers, currentSticks } = useStick(localStoreId);

  /**
   * Mirror of `nodes` for the drag handlers. They run from pointer events, not
   * from a render, so closing over the array would hand them whatever it was
   * when the callback was last built rather than what is on screen now.
   */
  const nodesRef = useRef<MindNode[]>(nodes);
  nodesRef.current = nodes;

  /** Every entry in a stuck row — both the followers and what they hang off. */
  const stuckIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [follower, anchor] of Object.entries(sticks)) {
      ids.add(follower);
      ids.add(anchor);
    }
    return ids;
  }, [sticks]);

  // Presentational-only "personal space": whatever's currently being dragged
  // pushes nearby nodes/orbs aside. Never touches persisted x/y — see
  // lib/repulsion.ts — so it can't cause data loss or drift.
  const [draggedPos, setDraggedPos] = useState<RepelPoint | null>(null);
  const pushOffsets = useMemo(() => {
    const items: RepelPoint[] = [
      ...nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      ...orbs.map((o) => ({ id: o.id, x: o.x, y: o.y })),
    ];
    return computePushOffsets(draggedPos, items);
  }, [draggedPos, nodes, orbs]);

  /**
   * Where the drag started, and where everything stuck to it started, so each
   * frame can move the whole row by the same delta. Captured on the first move
   * rather than on pointer-down, because a bubble only reports a drag once the
   * pointer has actually travelled — a plain click never gets here.
   */
  const dragOrigin = useRef<{
    id: string;
    x: number;
    y: number;
    followers: { id: string; x: number; y: number }[];
  } | null>(null);

  const handleNodeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      if (dragOrigin.current?.id !== id) {
        const node = nodesRef.current.find((n) => n.id === id);
        dragOrigin.current = {
          id,
          x: node?.x ?? x,
          y: node?.y ?? y,
          followers: followers(id)
            .map((fid) => nodesRef.current.find((n) => n.id === fid))
            .filter((n): n is MindNode => !!n)
            .map((n) => ({ id: n.id, x: n.x, y: n.y })),
        };
      }

      moveNodeLive(id, x, y);

      // A stuck row travels as one piece.
      const origin = dragOrigin.current;
      if (origin && origin.followers.length > 0) {
        const dx = x - origin.x;
        const dy = y - origin.y;
        for (const f of origin.followers) {
          moveNodeLive(f.id, Math.round(f.x + dx), Math.round(f.y + dy));
        }
      }

      setDraggedPos({ id, x, y });
    },
    [moveNodeLive, followers],
  );

  const handleNodeDragEnd = useCallback(() => {
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    setDraggedPos(null);

    const dragged = origin ? nodesRef.current.find((n) => n.id === origin.id) : undefined;
    if (dragged) {
      const sticks = currentSticks();
      const anchorId = sticks[dragged.id];

      if (anchorId) {
        // Already in a row: dragging it well clear of its anchor takes it out.
        const anchor = nodesRef.current.find((n) => n.id === anchorId);
        if (anchor && Math.hypot(dragged.x - anchor.x, dragged.y - anchor.y) > RELEASE_DISTANCE) {
          unstick(dragged.id);
        }
      } else {
        const target = findStickTarget(dragged.id, dragged, nodesRef.current, sticks);
        if (target) {
          const occupied = Object.entries(sticks)
            .filter(([, a]) => a === target.id)
            .map(([fid]) => {
              const f = nodesRef.current.find((n) => n.id === fid);
              return f ? f.x - target.x : NaN;
            })
            .filter((n) => Number.isFinite(n));
          const slot = slotPosition(target, dragged.x, occupied);
          moveNodeLive(dragged.id, slot.x, slot.y);
          stick(dragged.id, target.id);
        }
      }
    }

    commitPositions();
  }, [commitPositions, moveNodeLive, currentSticks, stick, unstick]);

  const handleOrbDragMove = useCallback(
    (id: string, x: number, y: number) => {
      moveOrbLive(id, x, y);
      setDraggedPos({ id, x, y });
    },
    [moveOrbLive],
  );
  const handleOrbDragEnd = useCallback(() => {
    commitOrbPosition();
    setDraggedPos(null);
  }, [commitOrbPosition]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'add' | 'edit' | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  /** Set when "Add a task to this orb" opened the node panel; assigns the new root task to that orb. */
  const [pendingOrbId, setPendingOrbId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<NodeKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<NodeStatus | 'all'>('open');
  const [showClearPrompt, setShowClearPrompt] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  /**
   * Whose map this window shows — the signed-in account if there is one,
   * otherwise the `?as=` persona. Absent for an ordinary single map, where
   * naming the only person on screen would be noise.
   */
  const demoBadgeLabel = useMemo(() => {
    if (user && partnerOf(user.id)) return accountName(user.id);
    return isPersonaMode ? persona.name : null;
  }, [user]);

  /** An item the other person sent is theirs to remove, not ours. */
  const canDeleteNode = useCallback(
    (id: string) => !sharedIds.has(id) || isOwnerOf(id),
    [sharedIds, isOwnerOf],
  );

  const shareStateFor = useCallback(
    (id: string): 'sent' | 'received' | null => {
      if (!sharedIds.has(id)) return null;
      return isOwnerOf(id) ? 'sent' : 'received';
    },
    [sharedIds, isOwnerOf],
  );

  /**
   * Sharing controls for whichever entry the panel has open. Null outside
   * persona mode, which is what keeps the single-map experience unchanged.
   */
  const sharePanelProps = useMemo<SharePanelProps | null>(() => {
    // Signed in: the partner comes from the account pairing. Signed out: from
    // the `?as=` persona. Either route gives the same control.
    const partnerId = user ? partnerOf(user.id) : isPersonaMode ? persona.partnerId : null;
    if (!partnerId || !selectedId) return null;

    const shared = sharedIds.has(selectedId);
    const owner = isOwnerOf(selectedId);
    const nameOf = user ? accountName : personaNameFor;

    // When it arrived from the other person, name whoever sent it rather than
    // "the partner" in the abstract.
    const senderId = user
      ? (nodes.find((n) => n.id === selectedId)?.ownerId ?? partnerId)
      : (shareInfo.get(selectedId)?.ownerId ?? partnerId);

    return {
      partnerName: shared && !owner ? nameOf(senderId) : nameOf(partnerId),
      isShared: shared,
      isOwner: owner,
      onSend: () => shareNode(selectedId, partnerId, attachmentsByNode.get(selectedId) ?? []),
      onTakeBack: () => unshareNode(selectedId),
      onReturn: () => {
        returnNode(selectedId);
        // It is about to leave this map, so nothing should stay selected.
        setSelectedId(null);
        setPanelMode(null);
      },
    };
  }, [user, nodes, selectedId, sharedIds, shareInfo, isOwnerOf, shareNode, unshareNode, returnNode, attachmentsByNode]);
  const selectedParent = selectedNode?.parentId ? nodes.find((n) => n.id === selectedNode.parentId) ?? null : null;

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      if (n.parentId) counts.set(n.parentId, (counts.get(n.parentId) ?? 0) + 1);
    });
    return counts;
  }, [nodes]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      return {
        x: (clientX - left - view.x) / view.scale,
        y: (clientY - top - view.y) / view.scale,
      };
    },
    [view.x, view.y, view.scale],
  );

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((prev) => {
      const nextScale = clampScale(prev.scale * factor);
      if (nextScale === prev.scale) return prev;
      const worldX = (px - prev.x) / prev.scale;
      const worldY = (py - prev.y) / prev.scale;
      return { scale: nextScale, x: px - worldX * nextScale, y: py - worldY * nextScale };
    });
  }, []);

  // Wheel / trackpad zoom, anchored on the pointer.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0016);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const zoomButton = useCallback(
    (factor: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      zoomAt((rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2, factor);
    },
    [zoomAt],
  );

  /** Frame the whole map (plus the focus orb) inside the viewport. */
  const fitView = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const topInset = 80;
    const bottomInset = 80;
    const availW = Math.max(rect.width - 48, 200);
    const availH = Math.max(rect.height - topInset - bottomInset, 200);

    if (nodes.length === 0) {
      setView({ x: rect.width / 2, y: topInset + availH / 2, scale: 1 });
      return;
    }

    // Always include world origin so the focus orb stays in frame.
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const pad = 70;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;

    // Never shrink past the point where node labels stop being readable —
    // the user can pan to reach whatever falls outside.
    const raw = Math.min(availW / (maxX - minX), availH / (maxY - minY), 1);
    const scale = clampScale(Math.max(raw, 0.75));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setView({ scale, x: rect.width / 2 - cx * scale, y: topInset + availH / 2 - cy * scale });
  }, [nodes]);

  // Frame the map once, after the first entries are known.
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current) return;
    if (dimensions.w === 0 || nodes.length === 0) return;
    didFit.current = true;
    fitView();
  }, [dimensions.w, nodes.length, fitView]);

  // Drag the empty canvas to pan.
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const panTeardown = useRef<(() => void) | null>(null);

  useEffect(() => () => panTeardown.current?.(), []);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      // Clear any gesture that never received its pointerup.
      panTeardown.current?.();
      panState.current = { startX: e.clientX, startY: e.clientY, originX: view.x, originY: view.y, moved: false };

      const onMove = (me: PointerEvent) => {
        const st = panState.current;
        if (!st) return;
        const dx = me.clientX - st.startX;
        const dy = me.clientY - st.startY;
        if (!st.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        st.moved = true;
        setView((prev) => ({ ...prev, x: st.originX + dx, y: st.originY + dy }));
      };

      const detach = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        panState.current = null;
        panTeardown.current = null;
      };

      function onUp() {
        const wasClick = !!panState.current && !panState.current.moved;
        detach();
        if (wasClick) setSelectedId(null);
      }

      function onCancel() {
        detach();
      }

      panTeardown.current = detach;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    [view.x, view.y],
  );

  const matchesFilters = useCallback(
    (n: MindNode) => {
      if (kindFilter !== 'all' && n.kind !== kindFilter) return false;
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !n.title.toLowerCase().includes(q) &&
          !n.owner.toLowerCase().includes(q) &&
          !n.detail.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    },
    [kindFilter, statusFilter, search],
  );

  const visibleNodes = useMemo(() => nodes.filter(matchesFilters), [nodes, matchesFilters]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const totalOpen = nodes.filter((n) => n.status === 'open').length;
  const staleCount = useMemo(() => getStaleOpenNodes(nodes).length, [nodes]);

  const openDigest = useCallback(() => setDigestOpen(true), []);
  useWeeklyDigestNotification(staleCount, openDigest);

  const handleStatusChange = useCallback(
    (id: string, status: NodeStatus) => {
      updateNode(id, { status });
      if (status === 'archived') setSelectedId(null);
    },
    [updateNode],
  );

  const openAdd = useCallback(() => {
    setPendingParentId(null);
    setPendingOrbId(null);
    setSelectedId(null);
    setOrbPanelMode(null);
    setSelectedOrbId(null);
    setPanelMode('add');
  }, []);

  const openAddChild = useCallback(() => {
    if (!selectedId) return;
    setPendingParentId(selectedId);
    setPendingOrbId(null);
    setOrbPanelMode(null);
    setSelectedOrbId(null);
    setPanelMode('add');
  }, [selectedId]);

  const openEdit = useCallback(() => {
    if (selectedId) {
      setOrbPanelMode(null);
      setSelectedOrbId(null);
      setPanelMode('edit');
    }
  }, [selectedId]);

  const closePanel = useCallback(() => {
    setPanelMode(null);
    setPendingParentId(null);
    setPendingOrbId(null);
  }, []);

  const openOrbEdit = useCallback((id: string) => {
    setPanelMode(null);
    setPendingParentId(null);
    setPendingOrbId(null);
    setSelectedOrbId(id);
    setOrbPanelMode('edit');
  }, []);

  const openAddOrb = useCallback(() => {
    setPanelMode(null);
    setPendingParentId(null);
    setPendingOrbId(null);
    setSelectedOrbId(null);
    setOrbPanelMode('add');
  }, []);

  const closeOrbPanel = useCallback(() => {
    setOrbPanelMode(null);
    setSelectedOrbId(null);
  }, []);

  const openAddTaskForOrb = useCallback((orbId: string) => {
    setOrbPanelMode(null);
    setSelectedOrbId(null);
    setPendingParentId(null);
    setPendingOrbId(orbId);
    setSelectedId(null);
    setPanelMode('add');
  }, []);

  const handleAddAttachmentFiles = useCallback(
    (nodeId: string, files: FileList) => {
      setAttachmentError(null);
      void (async () => {
        for (const file of Array.from(files)) {
          try {
            await addFileAttachment(nodeId, file);
          } catch (err) {
            setAttachmentError(err instanceof Error ? err.message : 'Could not add that file');
          }
        }
      })();
    },
    [addFileAttachment],
  );

  const handleAddAttachmentLink = useCallback(
    (nodeId: string, url: string, name?: string) => {
      setAttachmentError(null);
      addLinkAttachment(nodeId, url, name);
    },
    [addLinkAttachment],
  );

  /**
   * When the set of shared entries changes — one arrives, or is returned — pull
   * the attachment list again. The pictures belong to the entry, not to this
   * account, so they only become visible once the entry is.
   */
  useEffect(() => {
    if (!user) return;
    void refreshAttachments();
  }, [user, sharedIds, refreshAttachments]);

  // A picture attached *after* an item was sent must still reach the other
  // person, so the shared record's attachment list tracks the owner's own.
  // `syncSharedAttachments` ignores no-op calls, which is what stops this from
  // feeding back into itself.
  useEffect(() => {
    if (!isPersonaMode) return;
    for (const id of sharedIds) {
      if (!isOwnerOf(id)) continue;
      syncSharedAttachments(id, attachments.filter((a) => a.nodeId === id));
    }
  }, [attachments, sharedIds, isOwnerOf, syncSharedAttachments]);

  const handleDeleteNode = useCallback(
    (id: string) => {
      deleteNode(id);
      forgetNode(id);
      removeAttachmentsForNode(id);
      unassignNode(id);
    },
    [deleteNode, removeAttachmentsForNode, unassignNode, forgetNode],
  );

  const handleSelectNode = useCallback((id: string) => {
    setOrbPanelMode(null);
    setSelectedOrbId(null);
    setSelectedId(id);
  }, []);

  /**
   * Select from the list and bring the node into view. The centre is biased
   * right by the panel's width so the node doesn't land underneath the glass.
   * Scale is left alone — the list is for finding things, not re-zooming.
   */
  const handleSelectFromList = useCallback(
    (id: string) => {
      handleSelectNode(id);
      const node = nodes.find((n) => n.id === id);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!node || !rect || rect.width === 0) return;
      setView((prev) => ({
        ...prev,
        x: (rect.width + LIST_PANEL_SPACE) / 2 - node.x * prev.scale,
        y: rect.height / 2 - node.y * prev.scale,
      }));
    },
    [handleSelectNode, nodes],
  );

  const dismissNotice = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setNoticeDismissed(true);
    setShowClearPrompt(false);
  }, []);

  const showSeedNotice = !noticeDismissed && nodes.length > 0;
  const pendingParent = pendingParentId ? nodes.find((n) => n.id === pendingParentId) ?? null : null;
  const pendingOrb = pendingOrbId ? orbs.find((o) => o.id === pendingOrbId) ?? null : null;

  // Keyboard: N to add, Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        if (panelMode) closePanel();
        else if (orbPanelMode) closeOrbPanel();
        else setSelectedId(null);
      }
      if (!typing && (e.key === 'n' || e.key === 'N') && !panelMode && !orbPanelMode) {
        e.preventDefault();
        openAdd();
      }
      if (!typing && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setListOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelMode, orbPanelMode, closePanel, closeOrbPanel, openAdd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'hsl(228,35%,8%)' }}>
      <StarField />

      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        style={{ position: 'absolute', inset: 0, zIndex: Z.canvas, cursor: 'grab', touchAction: 'none' }}
      >
        {/* World space: everything inside shares one pan/zoom transform, so
            nodes and their connection lines can never drift apart. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {orbs.map((orb) => (
            <OrbView
              key={orb.id}
              orb={orb}
              isSelected={orb.id === selectedOrbId}
              pushOffset={pushOffsets.get(orb.id) ?? ZERO_PUSH}
              settle={motionPrefs.settle}
              onEdit={openOrbEdit}
              onDragMove={handleOrbDragMove}
              onDragEnd={handleOrbDragEnd}
              screenToWorld={screenToWorld}
            />
          ))}
          <ConnectionLines nodes={nodes} visibleIds={visibleIds} orbs={orbs} nodeOrbAssignments={nodeOrbAssignments} />
          <AnimatePresence>
            {visibleNodes.map((n) => (
              <NodeBubble
                key={n.id}
                node={n}
                isSelected={n.id === selectedId}
                isChild={n.parentId !== null}
                childCount={childCounts.get(n.id) ?? 0}
                attachments={attachmentsByNode.get(n.id) ?? EMPTY_ATTACHMENTS}
                shareState={shareStateFor(n.id)}
                isStuck={stuckIds.has(n.id)}
                pushOffset={pushOffsets.get(n.id) ?? ZERO_PUSH}
                motionPrefs={motionPrefs}
                onSelect={handleSelectNode}
                onDragMove={handleNodeDragMove}
                onDragEnd={handleNodeDragEnd}
                screenToWorld={screenToWorld}
              />
            ))}
          </AnimatePresence>
        </div>

        {visibleNodes.length === 0 && dimensions.w > 0 && (
          <EmptyState onAdd={openAdd} filtered={nodes.length > 0} />
        )}
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        kindFilter={kindFilter}
        onKindFilter={setKindFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onAdd={openAdd}
        totalOpen={totalOpen}
        staleCount={staleCount}
        digestOpen={digestOpen}
        onToggleDigest={() => setDigestOpen((v) => !v)}
        listOpen={listOpen}
        onToggleList={() => setListOpen((v) => !v)}
      />

      <AnimatePresence>
        {listOpen && (
          <ListPanel
            nodes={visibleNodes}
            allNodes={nodes}
            selectedId={selectedId}
            childCounts={childCounts}
            attachmentsByNode={attachmentsByNode}
            filtered={visibleNodes.length !== nodes.length}
            onSelect={handleSelectFromList}
            onClose={() => setListOpen(false)}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteNode}
            canDelete={canDeleteNode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {digestOpen && (
          <DigestPanel
            nodes={nodes}
            onClose={() => setDigestOpen(false)}
            onSelect={(id) => {
              setSelectedId(id);
              setPanelMode(null);
            }}
            onMarkHandled={(id) => handleStatusChange(id, 'handled')}
          />
        )}
      </AnimatePresence>

      {showSeedNotice && !showClearPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 14px',
            fontSize: 12,
            color: 'hsl(220,15%,50%)',
            zIndex: Z.chrome,
            fontWeight: 500,
            ...glassSurface('notice', { radius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, blur: motionPrefs.blurBar }),
          }}
        >
          <span>These are example entries.</span>
          <button
            onClick={() => setShowClearPrompt(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(262,60%,65%)', fontSize: 12, fontWeight: 600, padding: 0, textDecoration: 'underline', textDecorationColor: ACCENT_UNDERLINE }}
          >
            Clear them
          </button>
          <button onClick={dismissNotice} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,38%)', fontSize: 11, padding: 0, marginLeft: 4 }}>
            Keep
          </button>
        </motion.div>
      )}

      {showClearPrompt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            fontSize: 13,
            color: 'hsl(220,20%,80%)',
            zIndex: Z.chrome,
            fontWeight: 500,
            // Same material as the seed notice it replaces, at the same screen position.
            ...glassSurface('notice', { radius: RADIUS_MD, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, shadow: SHADOW_FLOAT, blur: motionPrefs.blurBar }),
          }}
        >
          <span>Remove every entry on the map?</span>
          <button
            onClick={() => {
              clearAllNodes();
              setSelectedId(null);
              dismissNotice();
            }}
            style={{ padding: '5px 12px', borderRadius: RADIUS_XS, border: `${BORDER_W}px solid ${DANGER_BORDER}`, background: DANGER_BG, color: 'hsl(0,70%,65%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Clear all
          </button>
          <button
            onClick={() => setShowClearPrompt(false)}
            style={{ padding: '5px 12px', borderRadius: RADIUS_XS, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Keep
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedNode && panelMode === null && (
          <NodeDetail
            node={selectedNode}
            parent={selectedParent}
            childCount={childCounts.get(selectedNode.id) ?? 0}
            onEdit={openEdit}
            onAddChild={openAddChild}
            onClose={() => setSelectedId(null)}
            onStatusChange={handleStatusChange}
            share={sharePanelProps}
          />
        )}
      </AnimatePresence>

      <NodePanel
        node={selectedNode}
        mode={panelMode}
        parentTitle={pendingParent?.title ?? null}
        orbName={pendingOrb?.name ?? null}
        hasChildren={(selectedNode && (childCounts.get(selectedNode.id) ?? 0) > 0) || false}
        onClose={closePanel}
        onAdd={(data) => {
          const created = addNode({ ...data, parentId: pendingParentId });
          if (pendingOrb) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 130 + Math.random() * 40;
            updateNode(created.id, {
              x: Math.round(pendingOrb.x + Math.cos(angle) * radius),
              y: Math.round(pendingOrb.y + Math.sin(angle) * radius),
            });
            assignNodeToOrb(created.id, pendingOrb.id);
          }
          setSelectedId(created.id);
        }}
        onUpdate={updateNode}
        onDelete={handleDeleteNode}
        onStatusChange={handleStatusChange}
        attachments={selectedNode ? (attachmentsByNode.get(selectedNode.id) ?? EMPTY_ATTACHMENTS) : EMPTY_ATTACHMENTS}
        onAddAttachmentFiles={handleAddAttachmentFiles}
        onAddAttachmentLink={handleAddAttachmentLink}
        onRemoveAttachment={removeAttachment}
        attachmentError={attachmentError}
        share={sharePanelProps}
      />

      <OrbPanel
        orb={selectedOrb}
        mode={orbPanelMode}
        onClose={closeOrbPanel}
        onAdd={(data) => addOrb(data.name, data.color)}
        onUpdate={(id, changes) => updateOrb(id, changes)}
        onRemove={removeOrb}
        onAddTask={openAddTaskForOrb}
        onAddOrb={openAddOrb}
      />

      <ZoomControls
        scale={view.scale}
        onZoomIn={() => zoomButton(1.25)}
        onZoomOut={() => zoomButton(1 / 1.25)}
        onReset={fitView}
      />

      {demoBadgeLabel && <PersonaBadge label={demoBadgeLabel} />}
      <PrivacyBadge status={syncStatus} />
      <AccountButton />
    </div>
  );
}
