import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Orb } from '../types';
import { ORB_COLOR_SWATCHES, DEFAULT_ORB_COLOR } from '../types';
import { glassSurface, glassScrim, GLASS_BORDER } from '../lib/glass';
import { RADIUS_SM, RADIUS_XS, BORDER_W, BORDER_W_EMPHASIS, BORDER_SUBTLE, BORDER_CONTROL, SHADOW_DRAWER, DANGER_BG, DANGER_BORDER, Z } from '../lib/tokens';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

interface Props {
  orb: Orb | null;
  mode: 'add' | 'edit' | null;
  onClose: () => void;
  onAdd: (data: { name: string; color: string }) => void;
  onUpdate: (id: string, changes: { name?: string; color?: string }) => void;
  onRemove: (id: string) => void;
  onAddTask: (orbId: string) => void;
  onAddOrb: () => void;
}

export function OrbPanel({ orb, mode, onClose, onAdd, onUpdate, onRemove, onAddTask, onAddOrb }: Props) {
  const prefs = useMotionPrefs();
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_ORB_COLOR);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && orb) {
      setName(orb.name);
      setColor(orb.color);
    } else if (mode === 'add') {
      setName('');
      setColor(DEFAULT_ORB_COLOR);
    }
    setConfirmRemove(false);
  }, [mode, orb?.id]);

  const isOpen = mode !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'add') {
      onAdd({ name: name.trim() || 'New orb', color });
      onClose();
    } else if (mode === 'edit' && orb) {
      onUpdate(orb.id, { name: name.trim() || orb.name, color });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: Z.scrim, ...glassScrim(prefs.blurScrim) }}
          />
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={prefs.panelSpring}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 340,
              borderLeft: GLASS_BORDER,
              zIndex: Z.drawer,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              ...glassSurface('panel', { border: 'none', shadow: SHADOW_DRAWER, blur: prefs.blurPanel }),
            }}
          >
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  padding: '24px 24px 16px',
                  borderBottom: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'hsl(220,20%,92%)', letterSpacing: '-0.02em' }}>
                  {mode === 'add' ? 'Add an orb' : 'Edit orb'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,15%,50%)', padding: 4, borderRadius: RADIUS_XS, display: 'flex' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Personal, Team, Projects"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      color: 'hsl(220,20%,92%)',
                      fontSize: 14,
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                      ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {ORB_COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={c}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: c,
                          cursor: 'pointer',
                          border: color.toLowerCase() === c ? '2px solid white' : '2px solid transparent',
                          boxShadow: color.toLowerCase() === c ? `0 0 0 2px ${c}` : 'none',
                          padding: 0,
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      title="Custom color"
                      style={{
                        width: 30,
                        height: 26,
                        borderRadius: RADIUS_XS,
                        border: `${BORDER_W_EMPHASIS}px solid ${BORDER_SUBTLE}`,
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {orb?.isPrimary && (
                  <p style={{ margin: 0, fontSize: 11.5, color: 'hsl(220,15%,45%)', lineHeight: 1.5 }}>
                    This is your map's centre orb — its position is fixed, but you can rename it and change its color.
                  </p>
                )}

                {mode === 'edit' && orb && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                      Tasks
                    </label>
                    <button
                      type="button"
                      onClick={() => onAddTask(orb.id)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: RADIUS_SM,
                        border: `${BORDER_W_EMPHASIS}px dashed ${color}`,
                        background: 'rgba(255,255,255,0.03)',
                        color,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Add a task to this orb
                    </button>

                    {/* Creating an orb used to sit in the top bar. It belongs
                        here instead: rare, and you are already looking at one. */}
                    <button
                      type="button"
                      onClick={onAddOrb}
                      style={{
                        width: '100%',
                        marginTop: 8,
                        padding: '9px 12px',
                        borderRadius: RADIUS_SM,
                        border: `${BORDER_W}px solid ${BORDER_CONTROL}`,
                        background: 'transparent',
                        color: 'hsl(220,15%,55%)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M6 4v4M4 6h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      New orb
                    </button>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 24px', borderTop: `${BORDER_W}px solid ${BORDER_SUBTLE}`, display: 'flex', gap: 10, flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: 11,
                      borderRadius: RADIUS_SM,
                      border: `${BORDER_W_EMPHASIS}px solid ${BORDER_CONTROL}`,
                      background: 'transparent',
                      color: 'hsl(220,15%,60%)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: 11,
                      borderRadius: RADIUS_SM,
                      border: 'none',
                      background: color,
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {mode === 'add' ? 'Add orb' : 'Save changes'}
                  </button>
                </div>

                {mode === 'edit' &&
                  orb &&
                  !orb.isPrimary &&
                  (confirmRemove ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(false)}
                        style={{ flex: 1, padding: 9, borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,55%)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Keep it
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRemove(orb.id);
                          onClose();
                        }}
                        style={{ flex: 1, padding: 9, borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${DANGER_BORDER}`, background: DANGER_BG, color: 'hsl(0,80%,70%)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      style={{ padding: 9, borderRadius: RADIUS_SM, border: '1px solid transparent', background: 'transparent', color: 'hsl(220,15%,38%)', fontSize: 13, cursor: 'pointer', fontWeight: 500, textAlign: 'center' }}
                    >
                      Remove orb
                    </button>
                  ))}
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
