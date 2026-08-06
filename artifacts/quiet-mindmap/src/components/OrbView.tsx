import { useRef, useState, useCallback, useEffect } from 'react';
import type { Orb } from '../types';
import { hexToRgba, hexToRgbString } from '../lib/color';
import { BORDER_W_EMPHASIS, Z } from '../lib/tokens';
import type { PushOffset } from '../lib/repulsion';

interface Props {
  orb: Orb;
  isSelected: boolean;
  /** Transient visual nudge away from whatever's currently being dragged nearby — never persisted. */
  pushOffset: PushOffset;
  /** CSS transition value for the push-offset settle animation, from useMotionPrefs(). */
  settle: string;
  onEdit: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  /** Converts a pointer event's client coords into world coords. */
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

/** The primary orb sits at world origin and can't be dragged; secondary orbs are free-floating landmarks. */
export function OrbView({ orb, isSelected, pushOffset, settle, onEdit, onDragMove, onDragEnd, screenToWorld }: Props) {
  const dragging = useRef(false);
  const grabOffset = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const teardown = useRef<(() => void) | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => () => teardown.current?.(), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      teardown.current?.();

      if (orb.isPrimary) {
        const handleUpStatic = () => onEdit(orb.id);
        window.addEventListener('pointerup', handleUpStatic, { once: true });
        return;
      }

      dragging.current = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const world = screenToWorld(e.clientX, e.clientY);
      grabOffset.current = { x: world.x - orb.x, y: world.y - orb.y };

      const applyAt = (clientX: number, clientY: number) => {
        const w = screenToWorld(clientX, clientY);
        onDragMove(orb.id, Math.round(w.x - grabOffset.current.x), Math.round(w.y - grabOffset.current.y));
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
          applyAt(ue.clientX, ue.clientY);
          onDragEnd();
        } else {
          onEdit(orb.id);
        }
      }

      function handleCancel() {
        const wasDragging = dragging.current;
        detach();
        dragging.current = false;
        setIsDragging(false);
        if (wasDragging) onDragEnd();
      }

      teardown.current = detach;
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
    },
    [orb.id, orb.x, orb.y, orb.isPrimary, onEdit, onDragMove, onDragEnd, screenToWorld],
  );

  const rgbVar = { '--hub-rgb': hexToRgbString(orb.color) } as React.CSSProperties;
  const size = orb.isPrimary ? 88 : 64;

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: orb.x + pushOffset.dx,
        top: orb.y + pushOffset.dy,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? Z.selected : orb.isPrimary ? Z.orbPrimary : Z.orbSecondary,
        touchAction: 'none',
        cursor: orb.isPrimary ? 'pointer' : 'grab',
        transition: isDragging ? 'none' : settle,
      }}
    >
      <div
        className="hub-pulse"
        style={{
          ...rgbVar,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 38%, ${hexToRgba(orb.color, 0.55)}, hsl(228,40%,18%))`,
          border: `${BORDER_W_EMPHASIS}px solid ${hexToRgba(orb.color, isSelected ? 0.9 : 0.5)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 3,
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        <svg width={orb.isPrimary ? 20 : 15} height={orb.isPrimary ? 20 : 15} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill={hexToRgba(orb.color, 0.9)} />
          <circle cx="10" cy="3" r="1.5" fill={hexToRgba(orb.color, 0.5)} />
          <circle cx="10" cy="17" r="1.5" fill={hexToRgba(orb.color, 0.5)} />
          <circle cx="3" cy="10" r="1.5" fill={hexToRgba(orb.color, 0.5)} />
          <circle cx="17" cy="10" r="1.5" fill={hexToRgba(orb.color, 0.5)} />
          <line x1="10" y1="7" x2="10" y2="4.5" stroke={hexToRgba(orb.color, 0.4)} strokeWidth="1" />
          <line x1="10" y1="13" x2="10" y2="15.5" stroke={hexToRgba(orb.color, 0.4)} strokeWidth="1" />
          <line x1="7" y1="10" x2="4.5" y2="10" stroke={hexToRgba(orb.color, 0.4)} strokeWidth="1" />
          <line x1="13" y1="10" x2="15.5" y2="10" stroke={hexToRgba(orb.color, 0.4)} strokeWidth="1" />
        </svg>
        <span
          style={{
            fontSize: orb.isPrimary ? 9 : 8,
            fontWeight: 700,
            color: hexToRgba(orb.color, 0.9),
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            maxWidth: size - 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {orb.name}
        </span>
      </div>
    </div>
  );
}
