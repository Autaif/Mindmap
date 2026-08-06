import { useState, useEffect, useRef, useCallback } from 'react';
import type { Attachment } from '../types';
import { getBlob, ATTACHMENT_ACCEPT } from '../lib/attachmentStore';
import { glassSurface, GLASS_VEIL } from '../lib/glass';
import { RADIUS_SM, RADIUS_XS, BORDER_W_EMPHASIS, BORDER_CONTROL, ACCENT_BG } from '../lib/tokens';
import { hoverStyle } from '../lib/hover';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Resolves an image/file attachment's IndexedDB blob to an object URL, revoking it on cleanup. */
export function useObjectUrl(attachment: Attachment) {
  const [url, setUrl] = useState<string | null>(attachment.assetUrl ?? null);

  useEffect(() => {
    // Shipped with the app: already a URL, and there is no object URL to revoke.
    if (attachment.assetUrl) {
      setUrl(attachment.assetUrl);
      return;
    }
    if (attachment.kind === 'link') {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    void getBlob(attachment.id).then((blob) => {
      if (cancelled || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [attachment.id, attachment.kind, attachment.assetUrl]);

  return url;
}

export function AttachmentIcon({ kind }: { kind: Attachment['kind'] }) {
  if (kind === 'link') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6.5 9.5l3-3M6 4.5H4.5A2.5 2.5 0 002 7v0a2.5 2.5 0 002.5 2.5H6M10 11.5h1.5A2.5 2.5 0 0014 9v0a2.5 2.5 0 00-2.5-2.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2.5h7l3 3v8a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 2.5V6h3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

const removeButtonHover = hoverStyle({ color: 'hsl(0,70%,60%)' });

// `insetBlur` comes from the caller (one useMotionPrefs() call in AttachmentList)
// rather than each row calling the hook itself — a node can have many attachments.
function AttachmentRow({ attachment, onRemove, insetBlur }: { attachment: Attachment; onRemove: (id: string) => void; insetBlur: string }) {
  const url = useObjectUrl(attachment);
  const isImage = attachment.kind === 'image';
  const href = attachment.kind === 'link' ? attachment.url : url ?? undefined;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        ...glassSurface('inset', { radius: RADIUS_SM, blur: insetBlur }),
      }}
    >
      {isImage && url ? (
        <img
          src={url}
          alt={attachment.name}
          style={{ width: 32, height: 32, borderRadius: RADIUS_XS, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: RADIUS_XS,
            background: GLASS_VEIL,
            color: 'hsl(220,15%,55%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AttachmentIcon kind={attachment.kind} />
        </span>
      )}

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        download={attachment.kind !== 'link' ? attachment.name : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'hsl(220,20%,85%)',
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={attachment.name}
      >
        {attachment.name}
        {attachment.size !== undefined && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'hsl(220,15%,48%)', fontWeight: 500 }}>
            {formatSize(attachment.size)}
          </span>
        )}
      </a>

      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        aria-label={`Remove ${attachment.name}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'hsl(220,15%,45%)',
          padding: 3,
          borderRadius: RADIUS_XS,
          flexShrink: 0,
          display: 'flex',
        }}
        {...removeButtonHover}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

interface Props {
  attachments: Attachment[];
  onAddFiles: (files: FileList) => void;
  onAddLink: (url: string, name?: string) => void;
  onRemove: (id: string) => void;
  error: string | null;
}

export function AttachmentList({ attachments, onAddFiles, onAddLink, onRemove, error }: Props) {
  const prefs = useMotionPrefs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const submitLink = useCallback(() => {
    const url = linkUrl.trim();
    if (!url) return;
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    onAddLink(withScheme, linkName.trim());
    setLinkUrl('');
    setLinkName('');
    setLinkOpen(false);
  }, [linkUrl, linkName, onAddLink]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((a) => (
            <AttachmentRow key={a.id} attachment={a} onRemove={onRemove} insetBlur={prefs.blurInset} />
          ))}
        </div>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'hsl(0,70%,65%)', fontWeight: 500 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W_EMPHASIS}px dashed ${BORDER_CONTROL}`,
            background: 'transparent',
            color: 'hsl(220,15%,58%)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Upload picture or file
        </button>
        <button
          type="button"
          onClick={() => setLinkOpen((v) => !v)}
          style={{
            padding: '8px 10px',
            borderRadius: RADIUS_SM,
            border: `${BORDER_W_EMPHASIS}px solid ${linkOpen ? 'hsl(262,60%,55%)' : BORDER_CONTROL}`,
            background: linkOpen ? ACCENT_BG : 'transparent',
            color: linkOpen ? 'hsl(262,65%,76%)' : 'hsl(220,15%,58%)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Link
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {linkOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitLink();
              }
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              color: 'hsl(220,20%,92%)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Label (optional)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitLink();
                }
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                color: 'hsl(220,20%,92%)',
                fontSize: 12.5,
                outline: 'none',
                boxSizing: 'border-box',
                ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
              }}
            />
            <button
              type="button"
              onClick={submitLink}
              disabled={!linkUrl.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: RADIUS_SM,
                border: 'none',
                background: linkUrl.trim() ? 'hsl(262,60%,55%)' : 'hsl(228,25%,20%)',
                color: linkUrl.trim() ? 'white' : 'hsl(220,15%,40%)',
                fontSize: 12,
                fontWeight: 700,
                cursor: linkUrl.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
