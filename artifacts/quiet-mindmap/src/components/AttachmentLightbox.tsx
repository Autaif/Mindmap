import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Attachment } from '../types';
import { useObjectUrl } from './AttachmentList';
import { glassScrim, glassSurface } from '../lib/glass';
import { RADIUS_MD, RADIUS_SM, SHADOW_POPOVER, Z } from '../lib/tokens';
import { hoverStyle } from '../lib/hover';

/**
 * Full-size view of one image, over a dimmed backdrop. Deliberately a separate
 * step from the node's thumbnail strip: a picture only takes over the screen
 * when it was asked for, never on hover.
 */

function Frame({ attachment }: { attachment: Attachment }) {
  const url = useObjectUrl(attachment);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={attachment.name}
      // Bounded by the viewport, not by the image's own pixel size — a phone
      // photo is several times wider than any screen it lands on.
      style={{
        display: 'block',
        maxWidth: '90vw',
        maxHeight: '82vh',
        width: 'auto',
        height: 'auto',
        borderRadius: RADIUS_MD,
        boxShadow: SHADOW_POPOVER,
      }}
    />
  );
}

const navHover = hoverStyle({ color: 'hsl(220,20%,92%)' });

interface Props {
  /** Every image on the node, so the arrows can step between them. */
  images: Attachment[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}

export function AttachmentLightbox({ images, index, onIndex, onClose }: Props) {
  const count = images.length;
  const step = useCallback(
    (delta: number) => onIndex((index + delta + count) % count),
    [index, count, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Stop the map's own Escape handler from also clearing the selection —
        // one press should close one layer.
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' && count > 1) {
        step(1);
      } else if (e.key === 'ArrowLeft' && count > 1) {
        step(-1);
      }
    };
    // Capture phase for the same reason: this is the topmost layer, so it gets
    // first refusal on the key.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, step, count]);

  const current = images[index];
  if (!current) return null;

  return createPortal(
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.lightbox,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        boxSizing: 'border-box',
        ...glassScrim('blur(6px)'),
      }}
    >
      <Frame attachment={current} />

      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 12px',
          maxWidth: '90vw',
          ...glassSurface('bar', { radius: RADIUS_SM }),
        }}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous image"
            style={navButton}
            {...navHover}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'hsl(220,20%,85%)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={current.name}
        >
          {current.name}
        </span>

        {count > 1 && (
          <>
            <span style={{ fontSize: 11.5, color: 'hsl(220,15%,48%)', fontWeight: 500, flexShrink: 0 }}>
              {index + 1}/{count}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              style={navButton}
              {...navHover}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        <button type="button" onClick={onClose} aria-label="Close" style={navButton} {...navHover}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}

const navButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'hsl(220,15%,55%)',
  padding: 3,
  display: 'flex',
  flexShrink: 0,
};
