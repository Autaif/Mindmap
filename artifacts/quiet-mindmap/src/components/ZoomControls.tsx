import { motion } from 'framer-motion';
import { MAX_SCALE, MIN_SCALE } from '../types';
import { glassSurface } from '../lib/glass';
import { RADIUS_MD, SHADOW_FLOAT, BORDER_SUBTLE, BORDER_W, ACCENT_BG, Z } from '../lib/tokens';
import { T_CONTROL } from '../lib/motion';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

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
  transition: T_CONTROL,
};

const buttonHover = hoverStyle({ color: 'hsl(262,65%,75%)', background: ACCENT_BG });

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: Props) {
  const prefs = useMotionPrefs();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: Z.chrome,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        overflow: 'hidden',
        ...glassSurface('bar', { radius: RADIUS_MD, shadow: SHADOW_FLOAT, blur: prefs.blurBar }),
      }}
    >
      <button
        onClick={onZoomIn}
        disabled={scale >= MAX_SCALE}
        title="Zoom in"
        aria-label="Zoom in"
        style={{ ...buttonStyle, opacity: scale >= MAX_SCALE ? 0.35 : 1 }}
        {...buttonHover}
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
          borderTop: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
          borderBottom: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
        }}
        {...buttonHover}
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        onClick={onZoomOut}
        disabled={scale <= MIN_SCALE}
        title="Zoom out"
        aria-label="Zoom out"
        style={{ ...buttonStyle, opacity: scale <= MIN_SCALE ? 0.35 : 1 }}
        {...buttonHover}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.5 7.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
