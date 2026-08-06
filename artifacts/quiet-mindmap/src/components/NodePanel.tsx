import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Attachment, MindNode, NodeKind } from '../types';
import { KIND_META, kindTint } from '../types';
import { AttachmentList } from './AttachmentList';
import { glassSurface, glassScrim, GLASS_BORDER } from '../lib/glass';
import { RADIUS_SM, RADIUS_XS, BORDER_W, BORDER_W_EMPHASIS, BORDER_SUBTLE, BORDER_CONTROL, BORDER_HOVER, SHADOW_DRAWER, ACCENT_BG, ACCENT_BORDER_STRONG, GLOW_ACCENT, DANGER_BG, DANGER_BORDER, dotGlow, Z } from '../lib/tokens';
import { T_COLOR, T_BORDER, T_BACKGROUND, T_CONTROL } from '../lib/motion';
import { hoverStyle, focusStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

interface Props {
  node: MindNode | null;
  mode: 'add' | 'edit' | null;
  /** Title of the parent when adding a sub-item, otherwise null. */
  parentTitle: string | null;
  /** Name of the orb a new root task is being added to, otherwise null. */
  orbName: string | null;
  hasChildren: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; detail: string; kind: NodeKind; owner: string }) => void;
  onUpdate: (id: string, changes: Partial<MindNode>) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MindNode['status']) => void;
  attachments: Attachment[];
  onAddAttachmentFiles: (nodeId: string, files: FileList) => void;
  onAddAttachmentLink: (nodeId: string, url: string, name?: string) => void;
  onRemoveAttachment: (id: string) => void;
  attachmentError: string | null;
  /** Sharing controls, or null when the app is running as a single map. */
  share: SharePanelProps | null;
}

export interface SharePanelProps {
  partnerName: string;
  isShared: boolean;
  /** False when this entry arrived from the other person. */
  isOwner: boolean;
  onSend: () => void;
  onTakeBack: () => void;
}

const KINDS: NodeKind[] = ['urgent', 'concern', 'idea', 'task'];

const closeButtonHover = hoverStyle({ color: 'hsl(220,20%,80%)' });
const removeTriggerHover = hoverStyle({ color: 'hsl(0,70%,60%)' });
const sendHover = hoverStyle({ boxShadow: GLOW_ACCENT, borderColor: 'hsl(262,60%,65%)' });
const takeBackHover = hoverStyle({ color: 'hsl(220,20%,80%)', borderColor: BORDER_HOVER });

export function NodePanel({
  node,
  mode,
  parentTitle,
  orbName,
  hasChildren,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onStatusChange,
  attachments,
  onAddAttachmentFiles,
  onAddAttachmentLink,
  onRemoveAttachment,
  attachmentError,
  share,
}: Props) {
  const prefs = useMotionPrefs();
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
              zIndex: Z.scrim,
              ...glassScrim(prefs.blurScrim),
            }}
          />
          {/* Panel */}
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
              width: 360,
              borderLeft: GLASS_BORDER,
              zIndex: Z.drawer,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              ...glassSurface('panel', { border: 'none', shadow: SHADOW_DRAWER, blur: prefs.blurPanel }),
            }}
          >
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{
                padding: '24px 24px 16px',
                borderBottom: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'hsl(220,20%,92%)', letterSpacing: '-0.02em' }}>
                    {mode === 'add' ? (parentTitle ? 'Add a sub-item' : 'Add to your map') : 'Edit entry'}
                  </h2>
                  {mode === 'add' && parentTitle && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'hsl(220,15%,48%)', fontWeight: 500 }}>
                      Under <span style={{ color: 'hsl(262,60%,68%)' }}>{parentTitle}</span>
                    </p>
                  )}
                  {mode === 'add' && !parentTitle && orbName && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'hsl(220,15%,48%)', fontWeight: 500 }}>
                      For the <span style={{ color: 'hsl(262,60%,68%)' }}>{orbName}</span> orb
                    </p>
                  )}
                </div>
                <button type="button" onClick={onClose} style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'hsl(220,15%,50%)',
                  padding: '4px',
                  borderRadius: RADIUS_XS,
                  display: 'flex',
                  alignItems: 'center',
                  transition: T_COLOR,
                }}
                  {...closeButtonHover}
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
                            borderRadius: RADIUS_SM,
                            border: `${BORDER_W_EMPHASIS}px solid ${active ? m.color : BORDER_SUBTLE}`,
                            background: active ? kindTint(k, 'bg') : 'transparent',
                            color: active ? m.color : 'hsl(220,15%,55%)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: T_CONTROL,
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0, boxShadow: active ? dotGlow(m.color) : 'none' }} />
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
                      color: 'hsl(220,20%,92%)',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      transition: T_BORDER,
                      boxSizing: 'border-box',
                      ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
                    }}
                    {...focusStyle({ borderColor: KIND_META[kind].color })}
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
                      color: 'hsl(220,20%,92%)',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      transition: T_BORDER,
                      boxSizing: 'border-box',
                      ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
                    }}
                    {...focusStyle({ borderColor: 'hsl(262,60%,65%)' })}
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
                      color: 'hsl(220,20%,92%)',
                      fontSize: '13px',
                      fontWeight: 400,
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: T_BORDER,
                      boxSizing: 'border-box',
                      ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
                    }}
                    {...focusStyle({ borderColor: 'hsl(262,60%,65%)' })}
                  />
                </div>

                {/* Attachments (edit mode only — needs an existing node id) */}
                {mode === 'edit' && node && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                      Attachments
                    </label>
                    <AttachmentList
                      attachments={attachments}
                      onAddFiles={(files) => onAddAttachmentFiles(node.id, files)}
                      onAddLink={(url, name) => onAddAttachmentLink(node.id, url, name)}
                      onRemove={onRemoveAttachment}
                      error={attachmentError}
                    />
                  </div>
                )}

                {/* Sharing (edit mode only — needs an existing node id) */}
                {mode === 'edit' && node && share && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                      {share.isShared ? 'Shared' : 'Send'}
                    </label>

                    {!share.isShared && (
                      <button
                        type="button"
                        onClick={share.onSend}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: RADIUS_SM,
                          border: `${BORDER_W_EMPHASIS}px solid ${ACCENT_BORDER_STRONG}`,
                          background: ACCENT_BG,
                          color: 'hsl(262,75%,78%)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: T_CONTROL,
                        }}
                        {...sendHover}
                      >
                        Send to {share.partnerName}
                      </button>
                    )}

                    {share.isShared && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'hsl(220,15%,62%)', fontWeight: 500 }}>
                          {share.isOwner
                            ? `On ${share.partnerName}'s map too. Changes either of you make show on both.`
                            : `Sent to you by ${share.partnerName}. Marking it handled tells them.`}
                        </p>
                        {share.isOwner && (
                          <button
                            type="button"
                            onClick={share.onTakeBack}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '7px 12px',
                              borderRadius: RADIUS_SM,
                              border: `${BORDER_W}px solid ${BORDER_CONTROL}`,
                              background: 'transparent',
                              color: 'hsl(220,15%,58%)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: T_CONTROL,
                            }}
                            {...takeBackHover}
                          >
                            Take it back
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                            borderRadius: RADIUS_SM,
                            border: `${BORDER_W_EMPHASIS}px solid ${node.status === s ? 'hsl(262,60%,65%)' : BORDER_SUBTLE}`,
                            background: node.status === s ? ACCENT_BG : 'transparent',
                            color: node.status === s ? 'hsl(262,75%,75%)' : 'hsl(220,15%,50%)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: T_CONTROL,
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
                borderTop: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
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
                      borderRadius: RADIUS_SM,
                      border: `${BORDER_W_EMPHASIS}px solid ${BORDER_CONTROL}`,
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
                      borderRadius: RADIUS_SM,
                      border: 'none',
                      background: title.trim() ? 'hsl(262,60%,55%)' : 'hsl(228,25%,20%)',
                      color: title.trim() ? 'white' : 'hsl(220,15%,40%)',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: title.trim() ? 'pointer' : 'not-allowed',
                      transition: T_BACKGROUND,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {mode === 'add' ? 'Add to map' : 'Save changes'}
                  </button>
                </div>

                {/* Only the person who sent an item may remove it — otherwise
                    tidying your own map would delete it off theirs as well. */}
                {mode === 'edit' && node && !(share?.isShared && !share.isOwner) && (
                  confirmDelete ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {hasChildren && (
                        <p style={{ margin: 0, fontSize: 12, color: 'hsl(220,15%,48%)', lineHeight: 1.5, textAlign: 'center' }}>
                          Its sub-items will stay on the map and move up a level.
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '9px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${BORDER_CONTROL}`, background: 'transparent', color: 'hsl(220,15%,55%)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                          Keep it
                        </button>
                        <button type="button" onClick={() => { onDelete(node.id); onClose(); }} style={{ flex: 1, padding: '9px', borderRadius: RADIUS_SM, border: `${BORDER_W}px solid ${DANGER_BORDER}`, background: DANGER_BG, color: 'hsl(0,80%,70%)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: '9px', borderRadius: RADIUS_SM, border: '1px solid transparent', background: 'transparent', color: 'hsl(220,15%,38%)', fontSize: '13px', cursor: 'pointer', fontWeight: 500, textAlign: 'center', transition: T_COLOR }}
                      {...removeTriggerHover}
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
