import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MindNode, NodeKind } from '../types';
import { KIND_META } from '../types';

interface Props {
  node: MindNode | null;
  mode: 'add' | 'edit' | null;
  onClose: () => void;
  onAdd: (data: { title: string; detail: string; kind: NodeKind; owner: string }) => void;
  onUpdate: (id: string, changes: Partial<MindNode>) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MindNode['status']) => void;
}

const KINDS: NodeKind[] = ['urgent', 'concern', 'idea', 'task'];

export function NodePanel({ node, mode, onClose, onAdd, onUpdate, onDelete, onStatusChange }: Props) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [kind, setKind] = useState<NodeKind>('task');
  const [owner, setOwner] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && node) {
      setTitle(node.title);
      setDetail(node.detail);
      setKind(node.kind);
      setOwner(node.owner);
    } else if (mode === 'add') {
      setTitle('');
      setDetail('');
      setKind('task');
      setOwner('');
    }
    setConfirmDelete(false);
  }, [mode, node?.id]);

  const isOpen = mode !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (mode === 'add') {
      onAdd({ title: title.trim(), detail: detail.trim(), kind, owner: owner.trim() });
      onClose();
    } else if (mode === 'edit' && node) {
      onUpdate(node.id, { title: title.trim(), detail: detail.trim(), kind, owner: owner.trim() });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,12,28,0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 90,
            }}
          />
          {/* Panel */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 360,
              background: 'hsl(228,32%,10%)',
              borderLeft: '1px solid hsl(228,25%,18%)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{
                padding: '24px 24px 16px',
                borderBottom: '1px solid hsl(228,25%,16%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'hsl(220,20%,92%)', letterSpacing: '-0.02em' }}>
                  {mode === 'add' ? 'Add to your map' : 'Edit entry'}
                </h2>
                <button type="button" onClick={onClose} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'hsl(220,15%,50%)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'hsl(220,20%,80%)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'hsl(220,15%,50%)')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Kind selector */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {KINDS.map(k => {
                      const m = KIND_META[k];
                      const active = kind === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKind(k)}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: `1.5px solid ${active ? m.color : 'hsl(228,25%,18%)'}`,
                            background: active ? m.bg : 'transparent',
                            color: active ? m.color : 'hsl(220,15%,55%)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0, boxShadow: active ? `0 0 6px ${m.color}` : 'none' }} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Title <span style={{ color: KIND_META[kind].color }}>*</span>
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What's on your mind?"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid hsl(228,25%,18%)',
                      background: 'hsl(228,30%,13%)',
                      color: 'hsl(220,20%,92%)',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = KIND_META[kind].color)}
                    onBlur={e => (e.target.style.borderColor = 'hsl(228,25%,18%)')}
                  />
                </div>

                {/* Owner */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Person / Team
                  </label>
                  <input
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    placeholder="Who is this about?"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid hsl(228,25%,18%)',
                      background: 'hsl(228,30%,13%)',
                      color: 'hsl(220,20%,92%)',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'hsl(262,60%,65%)')}
                    onBlur={e => (e.target.style.borderColor = 'hsl(228,25%,18%)')}
                  />
                </div>

                {/* Detail */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Private notes
                  </label>
                  <textarea
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                    placeholder="Context, background, what you really think..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid hsl(228,25%,18%)',
                      background: 'hsl(228,30%,13%)',
                      color: 'hsl(220,20%,92%)',
                      fontSize: '13px',
                      fontWeight: 400,
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'hsl(262,60%,65%)')}
                    onBlur={e => (e.target.style.borderColor = 'hsl(228,25%,18%)')}
                  />
                </div>

                {/* Edit-mode status actions */}
                {mode === 'edit' && node && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                      Status
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['open', 'handled', 'archived'] as MindNode['status'][]).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onStatusChange(node.id, s)}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: `1.5px solid ${node.status === s ? 'hsl(262,60%,65%)' : 'hsl(228,25%,18%)'}`,
                            background: node.status === s ? 'rgba(139,92,246,0.15)' : 'transparent',
                            color: node.status === s ? 'hsl(262,75%,75%)' : 'hsl(220,15%,50%)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.15s',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid hsl(228,25%,16%)',
                display: 'flex',
                gap: 10,
                flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: '10px',
                      border: '1.5px solid hsl(228,25%,20%)',
                      background: 'transparent',
                      color: 'hsl(220,15%,60%)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    style={{
                      flex: 2,
                      padding: '11px',
                      borderRadius: '10px',
                      border: 'none',
                      background: title.trim() ? 'hsl(262,60%,55%)' : 'hsl(228,25%,20%)',
                      color: title.trim() ? 'white' : 'hsl(220,15%,40%)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: title.trim() ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {mode === 'add' ? 'Add to map' : 'Save changes'}
                  </button>
                </div>

                {mode === 'edit' && node && (
                  confirmDelete ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid hsl(228,25%,20%)', background: 'transparent', color: 'hsl(220,15%,55%)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                        Keep it
                      </button>
                      <button type="button" onClick={() => { onDelete(node.id); onClose(); }} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: 'hsl(0,80%,70%)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: 'hsl(220,15%,38%)', fontSize: '13px', cursor: 'pointer', fontWeight: 500, textAlign: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'hsl(0,70%,60%)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'hsl(220,15%,38%)')}
                    >
                      Remove from map
                    </button>
                  )
                )}
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
