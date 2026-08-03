import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { MindNode } from '../types';
import { KIND_META } from '../types';

interface Props {
  node: MindNode;
  isSelected: boolean;
  isChild: boolean;
  childCount: number;
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
  onSelect,
  onDragMove,
  onDragEnd,
  screenToWorld,
}: Props) {
  const meta = KIND_META[node.kind];
  const dragging = useRef(false);
  const grabOffset = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  /** Tears down an in-flight drag; also used if we unmount mid-drag. */
  const teardown = useRef<(() => void) | null>(null);

  useEffect(() => () => teardown.current?.(), []);

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

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isArchived ? 0.4 : isHandled ? 0.62 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        zIndex: isSelected ? 50 : 10,
        touchAction: 'none',
      }}
    >
      <div
        style={{
          padding: isChild ? '8px 12px' : '10px 14px',
          borderRadius: isChild ? '10px' : '12px',
          background: isSelected ? meta.bg.replace('0.1)', '0.22)').replace('0.12)', '0.24)') : meta.bg,
          border: `${isChild ? 1 : 1.5}px ${isChild ? 'dashed' : 'solid'} ${isSelected ? meta.color : meta.border}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${meta.glow.replace('0.45)', '0.22)').replace('0.5)', '0.22)')}, 0 0 24px ${meta.glow}`
            : `0 0 12px ${meta.glow.replace('0.45)', '0.18)').replace('0.5)', '0.18)')}`,
          backdropFilter: 'blur(8px)',
          // Explicit width: this element's containing block is the zero-sized
          // world-space wrapper, so max-width alone collapses it to one word.
          width: isChild ? 150 : 176,
          boxSizing: 'border-box',
          transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: isChild ? 5 : 7,
            height: isChild ? 5 : 7,
            borderRadius: '50%',
            background: meta.color,
            boxShadow: `0 0 6px ${meta.color}`,
          }}
        />

        {isHandled && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background: 'rgba(0,0,0,0.32)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <p
          style={{
            margin: 0,
            fontSize: isChild ? 12 : 13,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'hsl(220,20%,92%)',
            letterSpacing: '-0.01em',
            paddingRight: 10,
          }}
        >
          {node.title}
        </p>

        {node.owner && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: meta.color, opacity: 0.85, fontWeight: 500 }}>
            {node.owner}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
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
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 5,
                padding: '1px 5px',
              }}
            >
              {childCount} sub
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
