import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StarField } from '../components/StarField';
import { NodeBubble } from '../components/NodeBubble';
import { NodePanel } from '../components/NodePanel';
import { FilterBar } from '../components/FilterBar';
import { useNodes } from '../hooks/useNodes';
import type { MindNode, NodeKind, NodeStatus } from '../types';
import { KIND_META } from '../types';

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
        borderRadius: '20px',
        background: 'rgba(13,15,33,0.7)',
        border: '1px solid hsl(228,25%,18%)',
        backdropFilter: 'blur(6px)',
        fontSize: '11px',
        color: 'hsl(220,15%,45%)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        zIndex: 20,
        userSelect: 'none',
        pointerEvents: 'none',
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

function CenterHub({ label }: { label: string }) {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none' }}>
      <div className="hub-pulse" style={{
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
      }}>
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
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function ConnectionLines({ nodes, cx, cy, filter }: { nodes: MindNode[]; cx: number; cy: number; filter: (n: MindNode) => boolean }) {
  const visible = nodes.filter(filter);
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
      {visible.map(n => {
        const meta = KIND_META[n.kind];
        const faded = n.status !== 'open';
        return (
          <line
            key={n.id}
            x1={cx} y1={cy}
            x2={n.x} y2={n.y}
            stroke={faded ? 'rgba(80,80,120,0.2)' : meta.border}
            strokeWidth={n.status === 'urgent' ? 1.5 : 1}
            strokeDasharray="4 8"
            opacity={faded ? 0.3 : 0.55}
            style={{ animation: 'orbit-flow 20s linear infinite' }}
          />
        );
      })}
    </svg>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 30,
        pointerEvents: 'none',
        marginTop: 60,
      }}
    >
      <p style={{ fontSize: '13px', color: 'hsl(220,15%,40%)', margin: '16px 0 0', fontWeight: 500, maxWidth: 220, lineHeight: 1.6 }}>
        Your map is clear.
        <br />
        <span
          onClick={onAdd}
          style={{ color: 'hsl(262,60%,65%)', cursor: 'pointer', pointerEvents: 'all', textDecoration: 'underline', textDecorationColor: 'rgba(139,92,246,0.4)' }}
        >
          Add your first entry
        </span>{' '}
        to begin.
      </p>
    </motion.div>
  );
}

function NodeDetail({ node, onEdit, onClose, onStatusChange }: { node: MindNode; onEdit: () => void; onClose: () => void; onStatusChange: (id: string, s: NodeStatus) => void }) {
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
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(480px, calc(100vw - 40px))',
        background: 'hsl(228,32%,10%)',
        border: `1px solid ${meta.border}`,
        borderRadius: 16,
        padding: '20px 22px',
        zIndex: 60,
        boxShadow: `0 0 40px ${meta.glow.replace('0.45)', '0.2)')}, 0 8px 32px rgba(0,0,0,0.5)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, boxShadow: `0 0 8px ${meta.color}`, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'hsl(220,20%,92%)', lineHeight: 1.3, letterSpacing: '-0.02em' }}>{node.title}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
            {node.owner && <span style={{ fontSize: '12px', color: meta.color, fontWeight: 600 }}>{node.owner}</span>}
            <span style={{ fontSize: '11px', color: 'hsl(220,15%,42%)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
            <span style={{ fontSize: '11px', color: 'hsl(220,15%,38%)', fontWeight: 500 }}>{date}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,45%)', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'hsl(220,20%,75%)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'hsl(220,15%,45%)')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Detail */}
      {node.detail && (
        <p style={{ margin: '0 0 14px 18px', fontSize: '13px', color: 'hsl(220,15%,58%)', lineHeight: 1.65, fontWeight: 400 }}>
          {node.detail}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginLeft: 18, flexWrap: 'wrap' }}>
        {node.status !== 'handled' && (
          <button onClick={() => onStatusChange(node.id, 'handled')} style={{
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)',
            color: '#34d399', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark handled
          </button>
        )}
        {node.status === 'handled' && (
          <button onClick={() => onStatusChange(node.id, 'open')} style={{
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid hsl(228,25%,20%)', background: 'transparent',
            color: 'hsl(220,15%,50%)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          }}>
            Reopen
          </button>
        )}
        {node.status !== 'archived' && (
          <button onClick={() => onStatusChange(node.id, 'archived')} style={{
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid hsl(228,25%,20%)', background: 'transparent',
            color: 'hsl(220,15%,45%)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
            Archive
          </button>
        )}
        {node.status === 'archived' && (
          <button onClick={() => onStatusChange(node.id, 'open')} style={{
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid hsl(228,25%,20%)', background: 'transparent',
            color: 'hsl(220,15%,50%)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          }}>
            Restore
          </button>
        )}
        <button onClick={onEdit} style={{
          padding: '7px 14px', borderRadius: '8px',
          border: '1px solid hsl(228,25%,20%)', background: 'transparent',
          color: 'hsl(220,15%,50%)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
        }}>
          Edit
        </button>
      </div>
    </motion.div>
  );
}

export function MindmapPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      if (canvasRef.current) {
        const r = canvasRef.current.getBoundingClientRect();
        setDimensions({ w: r.width, h: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  const { nodes, addNode, updateNode, moveNode, deleteNode, clearSeedNodes } = useNodes(dimensions.w, dimensions.h);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'add' | 'edit' | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<NodeKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<NodeStatus | 'all'>('open');
  const [showClearPrompt, setShowClearPrompt] = useState(false);

  const cx = dimensions.w / 2;
  const cy = dimensions.h / 2;

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null;

  const filterNode = useCallback((n: MindNode) => {
    if (kindFilter !== 'all' && n.kind !== kindFilter) return false;
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.owner.toLowerCase().includes(q) && !n.detail.toLowerCase().includes(q)) return false;
    }
    return true;
  }, [kindFilter, statusFilter, search]);

  const visibleNodes = nodes.filter(filterNode);
  const totalOpen = nodes.filter(n => n.status === 'open').length;

  const handleStatusChange = useCallback((id: string, status: NodeStatus) => {
    updateNode(id, { status });
    if (status === 'archived') setSelectedId(null);
  }, [updateNode]);

  const openAdd = useCallback(() => {
    setSelectedId(null);
    setPanelMode('add');
  }, []);

  const openEdit = useCallback(() => {
    if (selectedId) setPanelMode('edit');
  }, [selectedId]);

  const closePanel = useCallback(() => setPanelMode(null), []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setSelectedId(null);
  }, []);

  // Check if these are seed/example nodes
  const hasSeedWarning = nodes.length > 0 && !localStorage.getItem('quiet-mindmap-seeded-dismissed');

  const dismissSeed = () => {
    localStorage.setItem('quiet-mindmap-seeded-dismissed', '1');
    setShowClearPrompt(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'hsl(228,35%,8%)' }}>
      <StarField />

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        {dimensions.w > 0 && (
          <>
            <CenterHub label="focus" />
            <ConnectionLines nodes={visibleNodes} cx={cx} cy={cy} filter={filterNode} />
            <AnimatePresence>
              {visibleNodes.map(n => (
                <div key={n.id} data-node="1">
                  <NodeBubble
                    node={n}
                    isSelected={n.id === selectedId}
                    onSelect={setSelectedId}
                    onMove={moveNode}
                    canvasRef={canvasRef}
                  />
                </div>
              ))}
            </AnimatePresence>
            {visibleNodes.length === 0 && <EmptyState onAdd={openAdd} />}
          </>
        )}
      </div>

      {/* Top bar */}
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

      {/* Example data notice */}
      {hasSeedWarning && !showClearPrompt && nodes.length > 0 && (
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
            borderRadius: '10px',
            background: 'rgba(13,15,33,0.8)',
            border: '1px solid hsl(228,25%,20%)',
            backdropFilter: 'blur(8px)',
            fontSize: '12px',
            color: 'hsl(220,15%,50%)',
            zIndex: 70,
            fontWeight: 500,
          }}
        >
          <span>These are example entries.</span>
          <button onClick={() => setShowClearPrompt(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(262,60%,65%)', fontSize: '12px', fontWeight: 600, padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(139,92,246,0.4)' }}>
            Clear them
          </button>
          <button onClick={dismissSeed} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,38%)', fontSize: '11px', padding: 0, marginLeft: 4 }}>
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
            borderRadius: '12px',
            background: 'hsl(228,32%,11%)',
            border: '1px solid hsl(228,25%,22%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontSize: '13px',
            color: 'hsl(220,20%,80%)',
            zIndex: 70,
            fontWeight: 500,
          }}
        >
          <span>Remove all example entries?</span>
          <button onClick={() => { clearSeedNodes(); dismissSeed(); }} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: 'hsl(0,70%,65%)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            Clear all
          </button>
          <button onClick={() => setShowClearPrompt(false)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,50%)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Keep
          </button>
        </motion.div>
      )}

      {/* Selected node detail card */}
      <AnimatePresence>
        {selectedNode && panelMode === null && (
          <NodeDetail
            node={selectedNode}
            onEdit={openEdit}
            onClose={() => setSelectedId(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>

      {/* Add / Edit panel */}
      <NodePanel
        node={selectedNode}
        mode={panelMode}
        onClose={closePanel}
        onAdd={(data) => {
          const n = addNode(data);
          setSelectedId(n.id);
        }}
        onUpdate={updateNode}
        onDelete={deleteNode}
        onStatusChange={handleStatusChange}
      />

      <PrivacyBadge />
    </div>
  );
}
