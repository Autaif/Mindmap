import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Attachment, MindNode } from '../types';
import { KIND_META, kindTint } from '../types';
import { AttachmentLightbox } from './AttachmentLightbox';
import { useObjectUrl, AttachmentIcon } from './AttachmentList';
import { backdrop, GLASS_VEIL, GLASS_BORDER_COLOR } from '../lib/glass';
import { RADIUS_SM, RADIUS_MD, RADIUS_XS, BORDER_W, BORDER_W_EMPHASIS, ACCENT_BG, ACCENT_BORDER, dotGlow, Z } from '../lib/tokens';
import { T_BUBBLE } from '../lib/motion';
import type { MotionPrefs } from '../hooks/useMotionPrefs';
import type { PushOffset } from '../lib/repulsion';

const THUMB = 52;

/**
 * One attachment in a selected node's strip. Images show themselves; files and
 * links show an icon tile. Images open the lightbox, everything else opens in a
 * new tab — so the strip never becomes a dead decoration.
 */
function Thumbnail({ attachment, onOpen }: { attachment: Attachment; onOpen: () => void }) {
  const url = useObjectUrl(attachment);
  const isImage = attachment.kind === 'image';
  const href = attachment.kind === 'link' ? attachment.url : url ?? undefined;

  const common: React.CSSProperties = {
    width: THUMB,
    height: THUMB,
    borderRadius: RADIUS_SM,
    flexShrink: 0,
    boxSizing: 'border-box',
    cursor: 'pointer',
    border: `${BORDER_W}px solid ${GLASS_BORDER_COLOR}`,
  };

  // The bubble root starts a drag on pointerdown; without stopping it here a
  // click on a thumbnail would drag the whole node instead of opening.
  const swallowDrag = (e: React.PointerEvent) => e.stopPropagation();

  if (isImage && url) {
    return (
      <img
        src={url}
        alt={attachment.name}
        title={attachment.name}
        onPointerDown={swallowDrag}
        onClick={onOpen}
        // `contain` on paper white: a document thumbnail should read as a
        // shrunken page. `cover` would crop to whichever corner happens to be
        // top-left, which on a letterhead is an anonymous block of colour.
        style={{ ...common, objectFit: 'contain', background: '#fcfcfb', display: 'block' }}
      />
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={attachment.kind !== 'link' ? attachment.name : undefined}
      title={attachment.name}
      onPointerDown={swallowDrag}
      style={{
        ...common,
        background: GLASS_VEIL,
        color: 'hsl(220,15%,60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
      }}
    >
      <AttachmentIcon kind={attachment.kind} />
    </a>
  );
}

interface Props {
  node: MindNode;
  isSelected: boolean;
  isChild: boolean;
  childCount: number;
  attachments: Attachment[];
  /** 'sent' = shared with the other person; 'received' = they sent it here. */
  shareState: 'sent' | 'received' | null;
  /** Part of a stuck row — moves together with whatever it's joined to. */
  isStuck: boolean;
  /** Transient visual nudge away from whatever's currently being dragged nearby — never persisted. */
  pushOffset: PushOffset;
  /** From one useMotionPrefs() call in MindmapPage — not called here directly since this renders once per node. */
  motionPrefs: MotionPrefs;
  onSelect: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  /** Converts a pointer event's client coords into world coords. */
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

export function NodeBubble({
  node,
  isSelected,
  isChild,
  childCount,
  attachments,
  shareState,
  isStuck,
  pushOffset,
  motionPrefs,
  onSelect,
  onDragMove,
  onDragEnd,
  screenToWorld,
}: Props) {
  const meta = KIND_META[node.kind];
  const attachmentCount = attachments.length;
  const dragging = useRef(false);
  const grabOffset = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  /** Tears down an in-flight drag; also used if we unmount mid-drag. */
  const teardown = useRef<(() => void) | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Index into `images` while the full-size view is open; null when closed. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => a.kind === 'image');

  useEffect(() => () => teardown.current?.(), []);

  // Selecting another node (or deleting the attachment) must not leave a
  // full-size image stranded over the map.
  useEffect(() => {
    if (!isSelected) setLightboxIndex(null);
  }, [isSelected]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Keep the canvas from starting a pan behind us.
      e.stopPropagation();
      if (e.button !== 0) return;

      // A previous gesture that never got its pointerup (e.g. a lost pointer).
      teardown.current?.();

      dragging.current = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const world = screenToWorld(e.clientX, e.clientY);
      grabOffset.current = { x: world.x - node.x, y: world.y - node.y };

      const applyAt = (clientX: number, clientY: number) => {
        const w = screenToWorld(clientX, clientY);
        onDragMove(node.id, Math.round(w.x - grabOffset.current.x), Math.round(w.y - grabOffset.current.y));
      };

      const handleMove = (me: PointerEvent) => {
        if (!dragging.current) {
          const moved = Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4;
          if (!moved) return;
          dragging.current = true;
          setIsDragging(true);
        }
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        const { clientX, clientY } = me;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          applyAt(clientX, clientY);
        });
      };

      const detach = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        if (frame.current !== null) {
          cancelAnimationFrame(frame.current);
          frame.current = null;
        }
        teardown.current = null;
      };

      function handleUp(ue: PointerEvent) {
        const wasDragging = dragging.current;
        detach();
        dragging.current = false;
        setIsDragging(false);
        if (wasDragging) {
          // Apply the release position directly: a queued frame may never have
          // run, and the drop point is what must be persisted.
          applyAt(ue.clientX, ue.clientY);
          onDragEnd();
        } else {
          onSelect(node.id);
        }
      }

      function handleCancel() {
        const wasDragging = dragging.current;
        detach();
        dragging.current = false;
        setIsDragging(false);
        // Keep wherever the node last rendered rather than snapping back.
        if (wasDragging) onDragEnd();
      }

      teardown.current = detach;
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
    },
    [node.id, node.x, node.y, onSelect, onDragMove, onDragEnd, screenToWorld],
  );

  const isHandled = node.status === 'handled';
  const isArchived = node.status === 'archived';
  /**
   * Selection is the expand gesture — no second control to discover, and it
   * can't disagree with the side panel about which entry is open. An entry
   * with nothing more to show stays at its resting size.
   */
  const hasDetail = node.detail.trim().length > 0;
  const expanded = isSelected && (attachmentCount > 0 || hasDetail);
  /**
   * Finished work shrinks to a strikethrough line. With the status filter on
   * "all", a busy month otherwise fills the canvas with full-size entries
   * nobody needs to read any more — the map should show what's outstanding and
   * merely acknowledge what isn't. Selecting one restores it in full.
   */
  const compact = (isHandled || isArchived) && !isSelected;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isArchived ? 0.4 : isHandled ? 0.62 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={motionPrefs.bubbleSpring}
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: node.x + pushOffset.dx,
        top: node.y + pushOffset.dy,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        zIndex: isSelected ? Z.selected : Z.node,
        touchAction: 'none',
        // Only the item actually being dragged tracks the cursor instantly;
        // everything nudged aside by it eases in/out for the "bounce" feel.
        transition: isDragging ? 'none' : motionPrefs.settle,
      }}
    >
      {lightboxIndex !== null && (
        <AttachmentLightbox
          images={images}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      <div
        style={{
          padding: compact ? '5px 10px' : isChild ? '8px 12px' : '10px 14px',
          borderRadius: isChild ? RADIUS_SM : RADIUS_MD,
          background: kindTint(node.kind, isSelected ? 'bgActive' : 'bg'),
          border: `${isChild ? BORDER_W : BORDER_W_EMPHASIS}px ${isChild ? 'dashed' : 'solid'} ${isSelected ? meta.color : kindTint(node.kind, 'border')}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${kindTint(node.kind, 'ring')}, 0 0 24px ${kindTint(node.kind, 'glow')}`
            : `0 0 12px ${kindTint(node.kind, 'glowSoft')}`,
          // Cheapest blur tier: this is the highest-count backdrop layer on the map.
          ...backdrop(motionPrefs.blurInset),
          // Explicit width: this element's containing block is the zero-sized
          // world-space wrapper, so max-width alone collapses it to one word.
          // Selecting widens it to make room for the notes and attachment strip.
          width: compact ? 132 : isChild ? (expanded ? 206 : 150) : (expanded ? 236 : 176),
          boxSizing: 'border-box',
          transition: T_BUBBLE,
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {!compact && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: isChild ? 5 : 7,
              height: isChild ? 5 : 7,
              borderRadius: '50%',
              background: meta.color,
              boxShadow: dotGlow(meta.color),
            }}
          />
        )}

        {/* Selected but finished: the tick moves beside the title rather than
            covering the entry, so the notes and attachments stay readable. */}
        {isHandled && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 20 20"
            fill="none"
            style={{ position: 'absolute', top: compact ? 7 : 9, right: 9 }}
          >
            <path d="M4 10l4 4 8-8" stroke={meta.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        <p
          style={{
            margin: 0,
            fontSize: compact ? 11 : isChild ? 12 : 13,
            fontWeight: 600,
            lineHeight: 1.35,
            color: compact ? 'hsl(220,15%,62%)' : 'hsl(220,20%,92%)',
            letterSpacing: '-0.01em',
            paddingRight: isHandled ? 18 : 10,
            ...(compact && {
              textDecoration: 'line-through',
              textDecorationColor: 'hsl(220,15%,38%)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }),
          }}
        >
          {node.title}
        </p>

        {!compact && node.owner && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: meta.color, opacity: 0.85, fontWeight: 500 }}>
            {node.owner}
          </p>
        )}

        <div style={{ display: compact ? 'none' : 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span
            style={{
              fontSize: 10,
              color: 'hsl(220,15%,50%)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {meta.label}
          </span>
          {childCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'hsl(220,15%,58%)',
                background: GLASS_VEIL,
                borderRadius: RADIUS_XS,
                padding: '1px 5px',
              }}
            >
              {childCount} sub
            </span>
          )}
          {isStuck && (
            <span
              title="Joined — these move together"
              style={{
                display: 'flex',
                alignItems: 'center',
                color: 'hsl(220,15%,55%)',
                background: GLASS_VEIL,
                borderRadius: RADIUS_XS,
                padding: '2px 4px',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.5 9.5l3-3M6 4.5H4.5A2.5 2.5 0 002 7v0a2.5 2.5 0 002.5 2.5H6M10 11.5h1.5A2.5 2.5 0 0014 9v0a2.5 2.5 0 00-2.5-2.5H10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          {shareState && (
            <span
              title={shareState === 'sent' ? 'Shared with them' : 'They sent this'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                color: 'hsl(262,65%,74%)',
                background: ACCENT_BG,
                border: `${BORDER_W}px solid ${ACCENT_BORDER}`,
                borderRadius: RADIUS_XS,
                padding: '1px 5px',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                {shareState === 'sent' ? (
                  <path d="M1.5 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M10.5 6h-8M5.5 2.5L2 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {shareState === 'sent' ? 'Sent' : 'In'}
            </span>
          )}
          {attachmentCount > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontSize: 10,
                fontWeight: 600,
                color: 'hsl(220,15%,58%)',
                background: GLASS_VEIL,
                borderRadius: RADIUS_XS,
                padding: '1px 5px',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 3.5l-4 4a2 2 0 002.8 2.8l4-4a3.3 3.3 0 00-4.7-4.7l-4 4a1.5 1.5 0 002.1 2.1l3.6-3.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {attachmentCount}
            </span>
          )}
        </div>

        {expanded && hasDetail && (
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 11.5,
              lineHeight: 1.45,
              color: 'hsl(220,15%,68%)',
              fontWeight: 500,
              whiteSpace: 'pre-wrap',
            }}
          >
            {node.detail}
          </p>
        )}

        {expanded && attachmentCount > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 8,
            }}
          >
            {attachments.map((a) => (
              <Thumbnail
                key={a.id}
                attachment={a}
                onOpen={() => {
                  // Position within the images-only list the lightbox pages through,
                  // which is not the same index as in the mixed attachment list.
                  const i = images.findIndex((img) => img.id === a.id);
                  if (i !== -1) setLightboxIndex(i);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
