import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { MindNode } from '../types';
import { KIND_META } from '../types';
import { glassSurface, GLASS_VEIL_HOVER } from '../lib/glass';
import { RADIUS_LG, RADIUS_SM, RADIUS_XS, BORDER_SUBTLE, BORDER_W, SHADOW_FLOAT, SUCCESS_BG, SUCCESS_BORDER, dotGlow, Z } from '../lib/tokens';
import { T_BACKGROUND } from '../lib/motion';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export const STALE_DAYS = 7;
const NOTIFY_KEY = 'quiet-mindmap-digest-notified';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Entries still open that were created more than STALE_DAYS ago. */
export function getStaleOpenNodes(nodes: MindNode[], now = Date.now()): MindNode[] {
  const cutoff = now - STALE_DAYS * 24 * 60 * 60 * 1000;
  return nodes
    .filter((n) => n.status === 'open' && new Date(n.createdAt).getTime() < cutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function daysOpen(createdAt: string, now = Date.now()): number {
  return Math.floor((now - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Fires at most one browser notification per week when stale open entries
 * exist. Silently does nothing if permission was denied or never granted.
 */
export function useWeeklyDigestNotification(staleCount: number, onOpenDigest: () => void) {
  useEffect(() => {
    if (staleCount === 0) return;
    if (typeof Notification === 'undefined') return;

    const last = Number(localStorage.getItem(NOTIFY_KEY) ?? 0);
    if (Date.now() - last < WEEK_MS) return;

    const show = () => {
      localStorage.setItem(NOTIFY_KEY, String(Date.now()));
      const n = new Notification('AZM Mindmap — weekly digest', {
        body: `${staleCount} entr${staleCount === 1 ? 'y has' : 'ies have'} been open for more than ${STALE_DAYS} days.`,
      });
      n.onclick = () => {
        window.focus();
        onOpenDigest();
        n.close();
      };
    };

    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((p) => {
        if (p === 'granted') show();
      });
    }
  }, [staleCount, onOpenDigest]);
}

const staleRowHover = hoverStyle({ background: GLASS_VEIL_HOVER });

export function DigestPanel({
  nodes,
  onClose,
  onSelect,
  onMarkHandled,
}: {
  nodes: MindNode[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onMarkHandled: (id: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const stale = useMemo(() => getStaleOpenNodes(nodes, now), [nodes, now]);
  const prefs = useMotionPrefs();

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={prefs.panelSpring}
      style={{
        position: 'fixed',
        top: 68,
        right: 18,
        bottom: 60,
        width: 'min(340px, calc(100vw - 36px))',
        zIndex: Z.digest,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...glassSurface('panel', { radius: RADIUS_LG, shadow: SHADOW_FLOAT, blur: prefs.blurPanel }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px 12px', borderBottom: `${BORDER_W}px solid ${BORDER_SUBTLE}` }}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6" stroke="hsl(262,60%,65%)" strokeWidth="1.4" />
          <path d="M7.5 4v3.5l2.3 2.3" stroke="hsl(262,60%,65%)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'hsl(220,20%,88%)', letterSpacing: '-0.01em' }}>This week</p>
          <p style={{ margin: 0, fontSize: 11, color: 'hsl(220,15%,45%)', fontWeight: 500 }}>
            Open for more than {STALE_DAYS} days
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close digest"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,45%)', padding: 4, borderRadius: RADIUS_XS }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {stale.length === 0 ? (
          <p style={{ margin: '24px 12px', fontSize: 13, color: 'hsl(220,15%,48%)', lineHeight: 1.6, textAlign: 'center' }}>
            Nothing has been sitting open for more than {STALE_DAYS} days. Your map is current.
          </p>
        ) : (
          stale.map((n) => {
            const meta = KIND_META[n.kind];
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 9,
                  padding: '10px 10px',
                  borderRadius: RADIUS_SM,
                  cursor: 'pointer',
                  transition: T_BACKGROUND,
                }}
                onClick={() => onSelect(n.id)}
                {...staleRowHover}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, boxShadow: dotGlow(meta.color), marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'hsl(220,20%,86%)', lineHeight: 1.35 }}>{n.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'hsl(220,15%,45%)', fontWeight: 500 }}>
                    {meta.label}
                    {n.owner ? ` · ${n.owner}` : ''} · open {daysOpen(n.createdAt, now)}d
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkHandled(n.id);
                  }}
                  title="Mark handled"
                  aria-label={`Mark "${n.title}" handled`}
                  style={{
                    background: SUCCESS_BG,
                    border: `${BORDER_W}px solid ${SUCCESS_BORDER}`,
                    borderRadius: RADIUS_XS,
                    color: '#34d399',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
