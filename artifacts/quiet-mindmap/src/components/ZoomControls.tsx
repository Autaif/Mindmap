import { motion } from 'framer-motion';
import { MAX_SCALE, MIN_SCALE } from '../types';

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const buttonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'hsl(220,15%,60%)',
  transition: 'color 0.15s, background 0.15s',
};

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: Props) {
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = on ? 'hsl(262,65%,75%)' : 'hsl(220,15%,60%)';
    e.currentTarget.style.background = on ? 'rgba(139,92,246,0.12)' : 'transparent';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'rgba(13,15,33,0.85)',
        border: '1px solid hsl(228,25%,20%)',
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
      }}
    >
      <button
        onClick={onZoomIn}
        disabled={scale >= MAX_SCALE}
        title="Zoom in"
        aria-label="Zoom in"
        style={{ ...buttonStyle, opacity: scale >= MAX_SCALE ? 0.35 : 1 }}
        onMouseEnter={hover(true)}
        onMouseLeave={hover(false)}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <button
        onClick={onReset}
        title="Fit map to screen"
        aria-label="Fit map to screen"
        style={{
          ...buttonStyle,
          height: 28,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
          borderTop: '1px solid hsl(228,25%,18%)',
          borderBottom: '1px solid hsl(228,25%,18%)',
        }}
        onMouseEnter={hover(true)}
        onMouseLeave={hover(false)}
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        onClick={onZoomOut}
        disabled={scale <= MIN_SCALE}
        title="Zoom out"
        aria-label="Zoom out"
        style={{ ...buttonStyle, opacity: scale <= MIN_SCALE ? 0.35 : 1 }}
        onMouseEnter={hover(true)}
        onMouseLeave={hover(false)}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.5 7.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
