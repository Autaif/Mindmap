import { motion } from 'framer-motion';
import type { NodeKind, NodeStatus } from '../types';
import { KIND_META } from '../types';

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
}

const KINDS: (NodeKind | 'all')[] = ['all', 'urgent', 'concern', 'idea', 'task'];
const STATUSES: (NodeStatus | 'all')[] = ['all', 'open', 'handled', 'archived'];

export function FilterBar({ search, onSearch, kindFilter, onKindFilter, statusFilter, onStatusFilter, onAdd, totalOpen, staleCount, digestOpen, onToggleDigest }: Props) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(to bottom, rgba(13,15,33,0.95) 60%, transparent)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Logo / brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, hsl(262,60%,65%), hsl(228,40%,25%))',
          boxShadow: '0 0 12px rgba(139,92,246,0.4)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(220,20%,80%)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          AZM Mindmap
        </span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="hsl(220,15%,45%)" strokeWidth="1.5" />
          <path d="M9.5 9.5l2.5 2.5" stroke="hsl(220,15%,45%)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search..."
          style={{
            width: '100%',
            padding: '8px 10px 8px 30px',
            borderRadius: '10px',
            border: '1px solid hsl(228,25%,18%)',
            background: 'hsl(228,30%,12%)',
            color: 'hsl(220,20%,88%)',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Kind filters */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {KINDS.map(k => {
          const active = kindFilter === k;
          const meta = k !== 'all' ? KIND_META[k] : null;
          return (
            <button
              key={k}
              onClick={() => onKindFilter(k)}
              style={{
                padding: '6px 11px',
                borderRadius: '8px',
                border: `1px solid ${active ? (meta?.color ?? 'hsl(262,60%,65%)') : 'hsl(228,25%,18%)'}`,
                background: active ? (meta ? meta.bg : 'rgba(139,92,246,0.12)') : 'transparent',
                color: active ? (meta?.color ?? 'hsl(262,65%,72%)') : 'hsl(220,15%,50%)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textTransform: k === 'all' ? 'none' : 'capitalize',
              }}
            >
              {meta && <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, boxShadow: active ? `0 0 5px ${meta.color}` : 'none' }} />}
              {k === 'all' ? 'All' : KIND_META[k as NodeKind].label}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {STATUSES.map(s => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => onStatusFilter(s)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: `1px solid ${active ? 'hsl(262,60%,65%)' : 'hsl(228,25%,18%)'}`,
                background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
                color: active ? 'hsl(262,65%,72%)' : 'hsl(220,15%,45%)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All statuses' : s}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Weekly digest */}
      <button
        onClick={onToggleDigest}
        title={`Entries open for more than 7 days${staleCount ? ` (${staleCount})` : ''}`}
        style={{
          padding: '6px 11px',
          borderRadius: '8px',
          border: `1px solid ${digestOpen ? 'hsl(262,60%,65%)' : staleCount > 0 ? 'rgba(251,191,36,0.35)' : 'hsl(228,25%,18%)'}`,
          background: digestOpen ? 'rgba(139,92,246,0.12)' : staleCount > 0 ? 'rgba(251,191,36,0.08)' : 'transparent',
          color: digestOpen ? 'hsl(262,65%,72%)' : staleCount > 0 ? '#fbbf24' : 'hsl(220,15%,50%)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
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
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            background: 'rgba(251,191,36,0.18)',
            borderRadius: 5,
            padding: '1px 5px',
            color: '#fbbf24',
          }}>
            {staleCount}
          </span>
        )}
      </button>

      {/* Open count */}
      {totalOpen > 0 && (
        <div style={{
          padding: '5px 10px',
          borderRadius: '8px',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'hsl(262,65%,70%)',
          whiteSpace: 'nowrap',
        }}>
          {totalOpen} open
        </div>
      )}

      {/* Add button */}
      <button
        onClick={onAdd}
        style={{
          padding: '8px 16px',
          borderRadius: '10px',
          border: 'none',
          background: 'hsl(262,60%,55%)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: '-0.01em',
          boxShadow: '0 0 16px rgba(139,92,246,0.35)',
          transition: 'background 0.15s, box-shadow 0.15s',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'hsl(262,65%,62%)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(139,92,246,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'hsl(262,60%,55%)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(139,92,246,0.35)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Add
      </button>
    </motion.div>
  );
}
