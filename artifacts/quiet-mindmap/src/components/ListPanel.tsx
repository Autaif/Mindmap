import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Attachment, MindNode, NodeKind, NodeStatus } from '../types';
import { KIND_META, kindTint } from '../types';
import { glassSurface, GLASS_VEIL, GLASS_VEIL_HOVER } from '../lib/glass';
import {
  RADIUS_SM, RADIUS_XS, RADIUS_LG, BORDER_W, BORDER_SUBTLE, SHADOW_FLOAT,
  ACCENT_BORDER, DANGER_BG, DANGER_BORDER, dotGlow, Z,
} from '../lib/tokens';
import { T_BACKGROUND } from '../lib/motion';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

const emptyTrayHover = hoverStyle({ color: 'hsl(0,65%,62%)' });

/** Section order, loudest first — matches the kind filter order in the top bar. */
const KIND_ORDER: NodeKind[] = ['urgent', 'concern', 'idea', 'task'];

const PANEL_WIDTH = 300;
const PANEL_LEFT = 18;
/** Horizontal room the open panel occupies, for the map's centre-on-select bias. */
export const LIST_PANEL_SPACE = PANEL_WIDTH + PANEL_LEFT;

interface Row {
  node: MindNode;
  /** 0 = top level in its section, 1 = shown under its parent. Capped at 1 to stay readable at this width. */
  depth: number;
}

/**
 * Orders one kind's nodes so a child appears directly beneath its parent,
 * indented — but only when both share the section. A node whose parent is a
 * *different* kind (or is filtered out) stays at top level rather than being
 * duplicated into another section or hidden entirely.
 */
function orderWithinKind(group: MindNode[]): Row[] {
  const inGroup = new Set(group.map((n) => n.id));
  const childrenOf = new Map<string, MindNode[]>();
  const roots: MindNode[] = [];

  for (const n of group) {
    if (n.parentId && inGroup.has(n.parentId)) {
      const siblings = childrenOf.get(n.parentId);
      if (siblings) siblings.push(n);
      else childrenOf.set(n.parentId, [n]);
    } else {
      roots.push(n);
    }
  }

  const rows: Row[] = [];
  const seen = new Set<string>();
  const walk = (n: MindNode, depth: number) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    rows.push({ node: n, depth });
    for (const child of childrenOf.get(n.id) ?? []) walk(child, Math.min(depth + 1, 1));
  };
  roots.forEach((r) => walk(r, 0));

  // A parentId cycle would leave nodes unreachable from any root — surface them
  // flat rather than silently dropping entries the user can't recover elsewhere.
  for (const n of group) if (!seen.has(n.id)) rows.push({ node: n, depth: 0 });

  return rows;
}

/**
 * Per-row controls. Rendered as spans inside the row button rather than nested
 * buttons — a button inside a button is invalid HTML and browsers resolve the
 * click unpredictably. Keyboard users reach the same actions from the panel.
 */
function RowAction({
  label,
  onClick,
  visible,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  visible: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={(e) => {
        // The row itself selects the entry; an action must not also do that.
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: RADIUS_XS,
        flexShrink: 0,
        cursor: 'pointer',
        color: danger ? 'hsl(0,65%,62%)' : 'hsl(220,15%,52%)',
        background: GLASS_VEIL,
        // Kept in the layout even when hidden so rows don't jump on hover.
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: T_BACKGROUND,
      }}
    >
      {children}
    </span>
  );
}

const CheckIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UndoIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M3 5h5a2.5 2.5 0 010 5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 2.5L2.5 5 5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 3.5h7M5 3.5V2.5h2v1M3.5 3.5l.5 6h4l.5-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** One entry in the list. Used by both the open sections and the Done tray. */
function EntryRow({
  node,
  depth,
  isSelected,
  isHovered,
  subCount,
  attachCount,
  canDelete,
  onSelect,
  onHover,
  onStatusChange,
  onDelete,
}: {
  node: MindNode;
  depth: number;
  isSelected: boolean;
  isHovered: boolean;
  subCount: number;
  attachCount: number;
  canDelete: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onStatusChange: (id: string, status: NodeStatus) => void;
  onDelete: (id: string) => void;
}) {
  const handled = node.status === 'handled';
  const archived = node.status === 'archived';
  const isDone = handled || archived;
  const showActions = isHovered || isSelected;

  const meta: string[] = [];
  if (node.owner) meta.push(node.owner);
  if (subCount > 0) meta.push(`${subCount} sub`);
  if (attachCount > 0) meta.push(`${attachCount} file${attachCount === 1 ? '' : 's'}`);
  if (archived) meta.push('archived');

  return (
    <button
      onClick={() => onSelect(node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      aria-current={isSelected}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        textAlign: 'left',
        padding: '7px 9px',
        marginLeft: depth * 14,
        width: `calc(100% - ${depth * 14}px)`,
        borderRadius: RADIUS_SM,
        cursor: 'pointer',
        border: `${BORDER_W}px solid ${isSelected ? ACCENT_BORDER : 'transparent'}`,
        background: isSelected ? kindTint(node.kind, 'bg') : isHovered ? GLASS_VEIL_HOVER : 'transparent',
        transition: T_BACKGROUND,
        opacity: archived ? 0.5 : handled ? 0.72 : 1,
      }}
    >
      {depth > 0 && (
        <span aria-hidden style={{ color: 'hsl(220,15%,35%)', fontSize: 11, lineHeight: 1.4, flexShrink: 0 }}>↳</span>
      )}
      {isDone && (
        <span aria-hidden style={{ width: 7, height: 7, marginTop: 5, borderRadius: '50%', background: kindTint(node.kind, 'border'), flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'hsl(220,20%,86%)',
            lineHeight: 1.35,
            textDecoration: handled ? 'line-through' : 'none',
            textDecorationColor: 'hsl(220,15%,40%)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title}
        </span>
        {meta.length > 0 && (
          <span
            style={{
              display: 'block',
              margin: '2px 0 0',
              fontSize: 10.5,
              color: 'hsl(220,15%,45%)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {meta.join(' · ')}
          </span>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
        <RowAction
          label={isDone ? 'Put it back' : 'Mark handled'}
          visible={showActions}
          onClick={() => onStatusChange(node.id, isDone ? 'open' : 'handled')}
        >
          {isDone ? UndoIcon : CheckIcon}
        </RowAction>
        {canDelete && (
          <RowAction label="Remove" visible={showActions} danger onClick={() => onDelete(node.id)}>
            {TrashIcon}
          </RowAction>
        )}
      </span>
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
    >
      <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  /** Already filtered to what the map is showing, so a row can never select an invisible node. */
  nodes: MindNode[];
  /**
   * Everything on the map, filters ignored — the Done tray has to be reachable
   * whatever the top bar is currently showing, or finished work becomes
   * impossible to clear without first hunting for the right filter.
   */
  allNodes: MindNode[];
  selectedId: string | null;
  childCounts: Map<string, number>;
  attachmentsByNode: Map<string, Attachment[]>;
  /** True when a search/kind/status filter is narrowing the list. */
  filtered: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onStatusChange: (id: string, status: NodeStatus) => void;
  onDelete: (id: string) => void;
  /** Null for an entry the viewer may not remove (one the other person sent). */
  canDelete: (id: string) => boolean;
}

const DONE_STATUSES: NodeStatus[] = ['handled', 'archived'];

export function ListPanel({
  nodes,
  allNodes,
  selectedId,
  childCounts,
  attachmentsByNode,
  filtered,
  onSelect,
  onClose,
  onStatusChange,
  onDelete,
  canDelete,
}: Props) {
  const prefs = useMotionPrefs();
  const [collapsed, setCollapsed] = useState<Set<NodeKind>>(() => new Set());
  const [doneOpen, setDoneOpen] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  // Hover is React state rather than the shared hoverStyle() DOM swap: clicking a
  // row changes its selected background while the pointer is still over it, and a
  // later restore() would write the pre-click value back over the selection.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Finished work is listed once, in the Done tray — not scattered through the
  // kind sections as well, which is what made a busy map feel chaotic.
  const sections = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        rows: orderWithinKind(nodes.filter((n) => n.kind === kind && n.status === 'open')),
      })).filter((s) => s.rows.length > 0),
    [nodes],
  );

  const doneNodes = useMemo(
    () =>
      allNodes
        .filter((n) => DONE_STATUSES.includes(n.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allNodes],
  );

  const clearableDone = useMemo(() => doneNodes.filter((n) => canDelete(n.id)), [doneNodes, canDelete]);

  const toggle = (kind: NodeKind) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={prefs.panelSpring}
      aria-label="All entries"
      style={{
        position: 'fixed',
        top: 68,
        left: PANEL_LEFT,
        bottom: 60,
        width: `min(${PANEL_WIDTH}px, calc(100vw - 36px))`,
        zIndex: Z.list,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...glassSurface('panel', { radius: RADIUS_LG, shadow: SHADOW_FLOAT, blur: prefs.blurPanel }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px 12px', borderBottom: `${BORDER_W}px solid ${BORDER_SUBTLE}` }}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
          <path d="M5 3.5h8M5 7.5h8M5 11.5h8" stroke="hsl(262,60%,65%)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="2" cy="3.5" r="1" fill="hsl(262,60%,65%)" />
          <circle cx="2" cy="7.5" r="1" fill="hsl(262,60%,65%)" />
          <circle cx="2" cy="11.5" r="1" fill="hsl(262,60%,65%)" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'hsl(220,20%,88%)', letterSpacing: '-0.01em' }}>All entries</p>
          <p style={{ margin: 0, fontSize: 11, color: 'hsl(220,15%,45%)', fontWeight: 500 }}>
            {nodes.length} {nodes.length === 1 ? 'entry' : 'entries'}
            {filtered ? ' · filtered' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close list"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,45%)', padding: 4, borderRadius: RADIUS_XS, display: 'flex' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 12px' }}>
        {sections.length === 0 ? (
          <p style={{ margin: '24px 12px', fontSize: 13, color: 'hsl(220,15%,48%)', lineHeight: 1.6, textAlign: 'center' }}>
            {filtered ? 'Nothing matches these filters.' : 'Your map is clear.'}
          </p>
        ) : (
          sections.map(({ kind, rows }) => {
            const meta = KIND_META[kind];
            const isOpen = !collapsed.has(kind);
            return (
              <div key={kind} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => toggle(kind)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 8px',
                    background: 'none',
                    border: 'none',
                    borderRadius: RADIUS_XS,
                    cursor: 'pointer',
                    color: 'hsl(220,15%,52%)',
                    textAlign: 'left',
                  }}
                >
                  <Chevron open={isOpen} />
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, boxShadow: dotGlow(meta.color), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(220,15%,50%)', background: GLASS_VEIL, borderRadius: RADIUS_XS, padding: '1px 6px' }}>
                    {rows.length}
                  </span>
                </button>

                {isOpen &&
                  rows.map(({ node, depth }) => (
                    <EntryRow
                      key={node.id}
                      node={node}
                      depth={depth}
                      isSelected={node.id === selectedId}
                      isHovered={node.id === hoveredId}
                      subCount={childCounts.get(node.id) ?? 0}
                      attachCount={attachmentsByNode.get(node.id)?.length ?? 0}
                      canDelete={canDelete(node.id)}
                      onSelect={onSelect}
                      onHover={setHoveredId}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                    />
                  ))}
              </div>
            );
          })
        )}

        {/* Done tray. Finished work lives here rather than on the map, so a
            busy week doesn't turn the canvas into noise — but it stays one
            click away, and one click from coming back. */}
        {doneNodes.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `${BORDER_W}px solid ${BORDER_SUBTLE}` }}>
            <button
              onClick={() => {
                setDoneOpen((v) => !v);
                setConfirmEmpty(false);
              }}
              aria-expanded={doneOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 8px',
                background: 'none',
                border: 'none',
                borderRadius: RADIUS_XS,
                cursor: 'pointer',
                color: 'hsl(220,15%,52%)',
                textAlign: 'left',
              }}
            >
              <Chevron open={doneOpen} />
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: 'hsl(220,15%,45%)' }}>
                <path d="M2.5 3.5h7M5 3.5V2.5h2v1M3.5 3.5l.5 6h4l.5-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'hsl(220,15%,52%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Done
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(220,15%,50%)', background: GLASS_VEIL, borderRadius: RADIUS_XS, padding: '1px 6px' }}>
                {doneNodes.length}
              </span>
            </button>

            {doneOpen && (
              <>
                {doneNodes.map((node) => (
                  <EntryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    isSelected={node.id === selectedId}
                    isHovered={node.id === hoveredId}
                    subCount={childCounts.get(node.id) ?? 0}
                    attachCount={attachmentsByNode.get(node.id)?.length ?? 0}
                    canDelete={canDelete(node.id)}
                    onSelect={onSelect}
                    onHover={setHoveredId}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                  />
                ))}

                {clearableDone.length > 0 &&
                  (confirmEmpty ? (
                    <div style={{ display: 'flex', gap: 6, padding: '8px 9px 2px' }}>
                      <button
                        onClick={() => setConfirmEmpty(false)}
                        style={{ flex: 1, padding: '7px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_SUBTLE}`, background: 'transparent', color: 'hsl(220,15%,55%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Keep them
                      </button>
                      <button
                        onClick={() => {
                          clearableDone.forEach((n) => onDelete(n.id));
                          setConfirmEmpty(false);
                        }}
                        style={{ flex: 1, padding: '7px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${DANGER_BORDER}`, background: DANGER_BG, color: 'hsl(0,80%,70%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Delete {clearableDone.length}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmEmpty(true)}
                      style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: RADIUS_SM, border: 'none', background: 'transparent', color: 'hsl(220,15%,40%)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                      {...emptyTrayHover}
                    >
                      Empty the tray
                    </button>
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
