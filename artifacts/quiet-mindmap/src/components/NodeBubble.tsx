import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { MindNode } from '../types';
import { KIND_META } from '../types';

interface Props {
  node: MindNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function NodeBubble({ node, isSelected, onSelect, onMove, canvasRef }: Props) {
  const meta = KIND_META[node.kind];
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 };

    const canvas = canvasRef.current;
    if (!canvas) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!dragging.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragging.current = true;
      }
      if (dragging.current) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = me.clientX - canvasRect.left;
        const y = me.clientY - canvasRect.top;
        const el = document.getElementById(`node-${node.id}`);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      }
    };

    const onUp = (ue: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragging.current) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = ue.clientX - canvasRect.left;
        const y = ue.clientY - canvasRect.top;
        onMove(node.id, x, y);
      } else {
        onSelect(node.id);
      }
      dragging.current = false;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [node.id, onSelect, onMove, canvasRef]);

  const isHandled = node.status === 'handled';
  const isArchived = node.status === 'archived';

  return (
    <motion.div
      id={`node-${node.id}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isArchived ? 0.35 : isHandled ? 0.6 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        zIndex: isSelected ? 50 : 10,
      }}
      onPointerDown={handlePointerDown}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '12px',
          background: isSelected
            ? `linear-gradient(135deg, ${meta.bg.replace('0.1)', '0.22)')}, ${meta.bg.replace('0.1)', '0.16)')})`
            : meta.bg,
          border: `1.5px solid ${isSelected ? meta.color : meta.border}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${meta.glow.replace('0.45)', '0.25)')}, 0 0 24px ${meta.glow}`
            : `0 0 12px ${meta.glow.replace('0.45)', '0.2)')}`,
          backdropFilter: 'blur(8px)',
          maxWidth: '180px',
          minWidth: '110px',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {/* Kind indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: meta.color,
            boxShadow: `0 0 6px ${meta.color}`,
          }}
        />

        {/* Status overlay for handled */}
        {isHandled && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '11px',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <p style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: 1.35,
          color: 'hsl(220,20%,92%)',
          letterSpacing: '-0.01em',
          paddingRight: 10,
        }}>
          {node.title}
        </p>
        {node.owner && (
          <p style={{
            margin: '4px 0 0',
            fontSize: '11px',
            color: meta.color,
            opacity: 0.85,
            fontWeight: 500,
          }}>
            {node.owner}
          </p>
        )}
        <p style={{
          margin: '3px 0 0',
          fontSize: '10px',
          color: 'hsl(220,15%,50%)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {KIND_META[node.kind].label}
        </p>
      </div>
    </motion.div>
  );
}
