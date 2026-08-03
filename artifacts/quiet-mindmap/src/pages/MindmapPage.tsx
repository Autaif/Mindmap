import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StarField } from '../components/StarField';
import { NodeBubble } from '../components/NodeBubble';
import { NodePanel } from '../components/NodePanel';
import { FilterBar } from '../components/FilterBar';
import { ZoomControls } from '../components/ZoomControls';
import { useNodes } from '../hooks/useNodes';
import type { MindNode, NodeKind, NodeStatus, Viewport } from '../types';
import { KIND_META, clampScale } from '../types';

const DISMISS_KEY = 'quiet-mindmap-seed-notice-dismissed';

function PrivacyBadge() {
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
        borderRadius: 20,
        background: 'rgba(13,15,33,0.7)',
        border: '1px solid hsl(228,25%,18%)',
        backdropFilter: 'blur(6px)',
        fontSize: 11,
        color: 'hsl(220,15%,45%)',
        fontWeight: 500,
        zIndex: 20,
        userSelect: 'none',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1.5" y="4.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.5 4.5V3a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      Stays on this device only
    </motion.div>
  );
}

/** The focus orb, anchored at world origin. */
function CenterHub() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none' }}>
      <div
        className="hub-pulse"
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, hsl(262,55%,40%), hsl(228,40%,18%))',
          border: '1.5px solid rgba(139,92,246,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill="rgba(167,139,250,0.9)" />
          <circle cx="10" cy="3" r="1.5" fill="rgba(167,139,250,0.5)" />
          <circle cx="10" cy="17" r="1.5" fill="rgba(167,139,250,0.5)" />
          <circle cx="3" cy="10" r="1.5" fill="rgba(167,139,250,0.5)" />
          <circle cx="17" cy="10" r="1.5" fill="rgba(167,139,250,0.5)" />
          <line x1="10" y1="7" x2="10" y2="4.5" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
          <line x1="10" y1="13" x2="10" y2="15.5" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
          <line x1="7" y1="10" x2="4.5" y2="10" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
          <line x1="13" y1="10" x2="15.5" y2="10" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          focus
        </span>
      </div>
    </div>
  );
}

/**
 * Lines are drawn in the same transformed world space as the nodes, so they
 * track live while a node is dragged and stay correct at any zoom level.
 */
function ConnectionLines({ nodes, visibleIds }: { nodes: MindNode[]; visibleIds: Set<string> }) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <svg
      style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: 2 }}
    >
      {nodes
        .filter((n) => visibleIds.has(n.id))
        .map((n) => {
          const meta = KIND_META[n.kind];
          const faded = n.status !== 'open';

          // Attach to the nearest visible ancestor; fall back to the focus orb.
          let anchorX = 0;
          let anchorY = 0;
          let cursor = n.parentId ? byId.get(n.parentId) : undefined;
          const guard = new Set<string>();
          while (cursor && !guard.has(cursor.id)) {
            guard.add(cursor.id);
            if (visibleIds.has(cursor.id)) {
              anchorX = cursor.x;
              anchorY = cursor.y;
              break;
            }
            cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
          }

          const isSubLink = anchorX !== 0 || anchorY !== 0;

          return (
            <line
              key={n.id}
              x1={anchorX}
              y1={anchorY}
              x2={n.x}
              y2={n.y}
              stroke={faded ? 'rgba(120,125,165,0.35)' : meta.border}
              strokeWidth={isSubLink ? 1.5 : 1}
              strokeDasharray={isSubLink ? '2 5' : '4 8'}
              opacity={faded ? 0.3 : isSubLink ? 0.7 : 0.55}
              style={{ animation: 'orbit-flow 20s linear infinite' }}
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
        zIndex: 30,
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
                textDecorationColor: 'rgba(139,92,246,0.4)',
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

function NodeDetail({
  node,
  parent,
  childCount,
  onEdit,
  onAddChild,
  onClose,
  onStatusChange,
}: {
  node: MindNode;
  parent: MindNode | null;
  childCount: number;
  onEdit: () => void;
  onAddChild: () => void;
  onClose: () => void;
  onStatusChange: (id: string, s: NodeStatus) => void;
}) {
  const meta = KIND_META[node.kind];
  const date = new Date(node.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        position: 'fixed',
        bottom: 62,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(500px, calc(100vw - 40px))',
        background: 'hsl(228,32%,10%)',
        border: `1px solid ${meta.border}`,
        borderRadius: 16,
        padding: '18px 22px',
        zIndex: 60,
        boxShadow: `0 0 40px ${meta.glow.replace('0.45)', '0.18)').replace('0.5)', '0.18)')}, 0 8px 32px rgba(0,0,0,0.5)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, boxShadow: `0 0 8px ${meta.color}`, marginTop: 5, flexShrink: 0 }} />
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
              <span style={{ fontSize: 11, color: 'hsl(220,15%,50%)', fontWeight: 600, background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '1px 6px' }}>
                {childCount} sub-item{childCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,45%)', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(220,20%,75%)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(220,15%,45%)')}
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
              borderRadius: 8,
              border: '1px solid rgba(52,211,153,0.3)',
              background: 'rgba(52,211,153,0.1)',
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
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Reopen
          </button>
        )}

        <button
          onClick={onAddChild}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid rgba(139,92,246,0.3)',
            background: 'rgba(139,92,246,0.1)',
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
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,45%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Archive
          </button>
        )}
        {node.status === 'archived' && (
          <button
            onClick={() => onStatusChange(node.id, 'open')}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Restore
          </button>
        )}

        <button
          onClick={onEdit}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Edit
        </button>
      </div>
    </motion.div>
  );
}

export function MindmapPage() {
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

  const { nodes, addNode, updateNode, moveNodeLive, commitPositions, deleteNode, clearAllNodes } = useNodes(
    dimensions.w,
    dimensions.h,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'add' | 'edit' | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<NodeKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<NodeStatus | 'all'>('open');
  const [showClearPrompt, setShowClearPrompt] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
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

  const handleStatusChange = useCallback(
    (id: string, status: NodeStatus) => {
      updateNode(id, { status });
      if (status === 'archived') setSelectedId(null);
    },
    [updateNode],
  );

  const openAdd = useCallback(() => {
    setPendingParentId(null);
    setSelectedId(null);
    setPanelMode('add');
  }, []);

  const openAddChild = useCallback(() => {
    if (!selectedId) return;
    setPendingParentId(selectedId);
    setPanelMode('add');
  }, [selectedId]);

  const openEdit = useCallback(() => {
    if (selectedId) setPanelMode('edit');
  }, [selectedId]);

  const closePanel = useCallback(() => {
    setPanelMode(null);
    setPendingParentId(null);
  }, []);

  const dismissNotice = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setNoticeDismissed(true);
    setShowClearPrompt(false);
  }, []);

  const showSeedNotice = !noticeDismissed && nodes.length > 0;
  const pendingParent = pendingParentId ? nodes.find((n) => n.id === pendingParentId) ?? null : null;

  // Keyboard: N to add, Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        if (panelMode) closePanel();
        else setSelectedId(null);
      }
      if (!typing && (e.key === 'n' || e.key === 'N') && !panelMode) {
        e.preventDefault();
        openAdd();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelMode, closePanel, openAdd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'hsl(228,35%,8%)' }}>
      <StarField />

      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'grab', touchAction: 'none' }}
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
          <CenterHub />
          <ConnectionLines nodes={nodes} visibleIds={visibleIds} />
          <AnimatePresence>
            {visibleNodes.map((n) => (
              <NodeBubble
                key={n.id}
                node={n}
                isSelected={n.id === selectedId}
                isChild={n.parentId !== null}
                childCount={childCounts.get(n.id) ?? 0}
                onSelect={setSelectedId}
                onDragMove={moveNodeLive}
                onDragEnd={commitPositions}
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
      />

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
            borderRadius: 10,
            background: 'rgba(13,15,33,0.85)',
            border: '1px solid hsl(228,25%,20%)',
            backdropFilter: 'blur(8px)',
            fontSize: 12,
            color: 'hsl(220,15%,50%)',
            zIndex: 70,
            fontWeight: 500,
          }}
        >
          <span>These are example entries.</span>
          <button
            onClick={() => setShowClearPrompt(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(262,60%,65%)', fontSize: 12, fontWeight: 600, padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(139,92,246,0.4)' }}
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
            borderRadius: 12,
            background: 'hsl(228,32%,11%)',
            border: '1px solid hsl(228,25%,22%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontSize: 13,
            color: 'hsl(220,20%,80%)',
            zIndex: 70,
            fontWeight: 500,
          }}
        >
          <span>Remove every entry on the map?</span>
          <button
            onClick={() => {
              clearAllNodes();
              setSelectedId(null);
              dismissNotice();
            }}
            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: 'hsl(0,70%,65%)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Clear all
          </button>
          <button
            onClick={() => setShowClearPrompt(false)}
            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
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
          />
        )}
      </AnimatePresence>

      <NodePanel
        node={selectedNode}
        mode={panelMode}
        parentTitle={pendingParent?.title ?? null}
        hasChildren={(selectedNode && (childCounts.get(selectedNode.id) ?? 0) > 0) || false}
        onClose={closePanel}
        onAdd={(data) => {
          const created = addNode({ ...data, parentId: pendingParentId });
          setSelectedId(created.id);
        }}
        onUpdate={updateNode}
        onDelete={deleteNode}
        onStatusChange={handleStatusChange}
      />

      <ZoomControls
        scale={view.scale}
        onZoomIn={() => zoomButton(1.25)}
        onZoomOut={() => zoomButton(1 / 1.25)}
        onReset={fitView}
      />

      <PrivacyBadge />
    </div>
  );
}
