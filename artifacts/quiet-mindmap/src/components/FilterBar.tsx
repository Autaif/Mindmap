import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeKind, NodeStatus } from '../types';
import { KIND_META, kindTint } from '../types';
import { glassSurface, GLASS_TOPBAR_BG } from '../lib/glass';
import {
  RADIUS_SM, RADIUS_MD, RADIUS_XS, BORDER_W, BORDER_SUBTLE, BORDER_HOVER,
  ACCENT_BG, ACCENT_BORDER, GLOW_ACCENT, GLOW_ACCENT_STRONG, SHADOW_FLOAT,
  WARN_BG, WARN_BORDER, WARN_CHIP_BG, dotGlow, Z,
} from '../lib/tokens';
import { T_CONTROL, T_BUTTON } from '../lib/motion';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  kindFilter: NodeKind | 'all';
  onKindFilter: (v: NodeKind | 'all') => void;
  statusFilter: NodeStatus | 'all';
  onStatusFilter: (v: NodeStatus | 'all') => void;
  onAdd: () => void;
  totalOpen: number;
  staleCount: number;
  digestOpen: boolean;
  onToggleDigest: () => void;
  listOpen: boolean;
  onToggleList: () => void;
}

const KINDS: (NodeKind | 'all')[] = ['all', 'urgent', 'concern', 'idea', 'task'];
const STATUSES: (NodeStatus | 'all')[] = ['open', 'handled', 'archived', 'all'];

const STATUS_LABEL: Record<NodeStatus | 'all', string> = {
  open: 'Open',
  handled: 'Handled',
  archived: 'Archived',
  all: 'Everything',
};

const addHover = hoverStyle({ background: 'hsl(262,65%,62%)', boxShadow: GLOW_ACCENT_STRONG });
const iconButtonHover = hoverStyle({ borderColor: BORDER_HOVER, color: 'hsl(220,20%,78%)' });

/** `open` is the resting state, so it doesn't count as a filter being applied. */
function isFiltering(kind: NodeKind | 'all', status: NodeStatus | 'all') {
  return kind !== 'all' || status !== 'open';
}

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  const tone = color ?? 'hsl(262,60%,65%)';
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 11px',
        borderRadius: RADIUS_SM,
        border: `${BORDER_W}px solid ${active ? tone : BORDER_SUBTLE}`,
        background: active ? ACCENT_BG : 'transparent',
        color: active ? tone : 'hsl(220,15%,52%)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: T_CONTROL,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Kind and status live behind one control rather than as nine permanent
 * buttons. They are set once and rarely changed, so they don't earn standing
 * space next to the things used constantly — search, the list, and Add.
 */
function FilterPopover({
  kindFilter,
  onKindFilter,
  statusFilter,
  onStatusFilter,
  onClose,
}: {
  kindFilter: NodeKind | 'all';
  onKindFilter: (v: NodeKind | 'all') => void;
  statusFilter: NodeStatus | 'all';
  onStatusFilter: (v: NodeStatus | 'all') => void;
  onClose: () => void;
}) {
  const prefs = useMotionPrefs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Deferred a frame: the click that opened this would otherwise close it.
    const id = requestAnimationFrame(() => window.addEventListener('pointerdown', onDown));
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={prefs.panelSpring}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        width: 250,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: Z.filterBar,
        ...glassSurface('panel', { radius: RADIUS_MD, shadow: SHADOW_FLOAT, blur: prefs.blurPanel }),
      }}
    >
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, color: 'hsl(220,15%,48%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Type
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {KINDS.map((k) => {
            const meta = k !== 'all' ? KIND_META[k] : null;
            return (
              <Chip key={k} active={kindFilter === k} onClick={() => onKindFilter(k)} color={meta?.color}>
                {meta && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: meta.color,
                      boxShadow: kindFilter === k ? dotGlow(meta.color) : 'none',
                    }}
                  />
                )}
                {k === 'all' ? 'All' : KIND_META[k as NodeKind].label}
              </Chip>
            );
          })}
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, color: 'hsl(220,15%,48%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Status
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {STATUSES.map((s) => (
            <Chip key={s} active={statusFilter === s} onClick={() => onStatusFilter(s)}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </div>

      {isFiltering(kindFilter, statusFilter) && (
        <button
          onClick={() => {
            onKindFilter('all');
            onStatusFilter('open');
          }}
          style={{
            padding: '7px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
            background: 'transparent',
            color: 'hsl(220,15%,55%)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      )}
    </motion.div>
  );
}

export function FilterBar({
  search,
  onSearch,
  kindFilter,
  onKindFilter,
  statusFilter,
  onStatusFilter,
  onAdd,
  totalOpen,
  staleCount,
  digestOpen,
  onToggleDigest,
  listOpen,
  onToggleList,
}: Props) {
  const prefs = useMotionPrefs();
  const [filterOpen, setFilterOpen] = useState(false);
  const filtering = isFiltering(kindFilter, statusFilter);

  const iconButton = (active: boolean): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: RADIUS_SM,
    border: `${BORDER_W}px solid ${active ? 'hsl(262,60%,65%)' : BORDER_SUBTLE}`,
    background: active ? ACCENT_BG : 'transparent',
    color: active ? 'hsl(262,65%,72%)' : 'hsl(220,15%,52%)',
    cursor: 'pointer',
    transition: T_CONTROL,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
  });

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, ...prefs.panelSpring }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: Z.filterBar,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        // Not a full panel: no border, fades to transparent at its lower edge.
        ...glassSurface('bar', { background: GLASS_TOPBAR_BG, border: 'none', blur: prefs.blurBar }),
      }}
    >
      {/* Logo / brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4, flexShrink: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, hsl(262,60%,65%), hsl(228,40%,25%))',
            boxShadow: GLOW_ACCENT,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(220,20%,80%)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          AZM Mindmap
        </span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
        <svg
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <circle cx="6" cy="6" r="4.5" stroke="hsl(220,15%,45%)" strokeWidth="1.5" />
          <path d="M9.5 9.5l2.5 2.5" stroke="hsl(220,15%,45%)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%',
            padding: '8px 10px 8px 30px',
            color: 'hsl(220,20%,88%)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
          }}
        />
      </div>

      {/* Filters, behind one control */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          title="Filter by type and status"
          style={{
            padding: '6px 11px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W}px solid ${filterOpen || filtering ? 'hsl(262,60%,65%)' : BORDER_SUBTLE}`,
            background: filterOpen || filtering ? ACCENT_BG : 'transparent',
            color: filterOpen || filtering ? 'hsl(262,65%,72%)' : 'hsl(220,15%,52%)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: T_CONTROL,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 3h11M3.5 7h7M5.5 11h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {filtering
            ? `${kindFilter === 'all' ? 'All' : KIND_META[kindFilter].label} · ${STATUS_LABEL[statusFilter]}`
            : 'Filter'}
        </button>

        <AnimatePresence>
          {filterOpen && (
            <FilterPopover
              kindFilter={kindFilter}
              onKindFilter={onKindFilter}
              statusFilter={statusFilter}
              onStatusFilter={onStatusFilter}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1 }} />

      {/* Open count */}
      {totalOpen > 0 && (
        <div
          style={{
            padding: '5px 10px',
            borderRadius: RADIUS_SM,
            background: ACCENT_BG,
            border: `${BORDER_W}px solid ${ACCENT_BORDER}`,
            fontSize: 12,
            fontWeight: 600,
            color: 'hsl(262,65%,70%)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {totalOpen} open
        </div>
      )}

      {/* Weekly digest — only once something has actually gone stale. An empty
          warning is noise, and it competes with the things that matter. */}
      {(staleCount > 0 || digestOpen) && (
        <button
          onClick={onToggleDigest}
          title={`Entries open for more than 7 days${staleCount ? ` (${staleCount})` : ''}`}
          aria-pressed={digestOpen}
          style={{
            padding: '6px 11px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W}px solid ${digestOpen ? 'hsl(262,60%,65%)' : WARN_BORDER}`,
            background: digestOpen ? ACCENT_BG : WARN_BG,
            color: digestOpen ? 'hsl(262,65%,72%)' : '#fbbf24',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: T_CONTROL,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7.5 4v3.5l2.3 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          This week
          {staleCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, background: WARN_CHIP_BG, borderRadius: RADIUS_XS, padding: '1px 5px', color: '#fbbf24' }}>
              {staleCount}
            </span>
          )}
        </button>
      )}

      {/* Categorised list */}
      <button
        onClick={onToggleList}
        title="Browse every entry, grouped by type (L)"
        aria-label="Browse every entry"
        aria-pressed={listOpen}
        style={iconButton(listOpen)}
        {...iconButtonHover}
      >
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M5 3.5h8M5 7.5h8M5 11.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="2" cy="3.5" r="1" fill="currentColor" />
          <circle cx="2" cy="7.5" r="1" fill="currentColor" />
          <circle cx="2" cy="11.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* Add */}
      <button
        onClick={onAdd}
        style={{
          padding: '8px 16px',
          borderRadius: RADIUS_SM,
          border: 'none',
          background: 'hsl(262,60%,55%)',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: '-0.01em',
          boxShadow: GLOW_ACCENT,
          transition: T_BUTTON,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        {...addHover}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Add
      </button>
    </motion.div>
  );
}
