import type { Attachment, MindNode } from '../types';
import { supabase } from './supabase';

/**
 * The two calls the sync engine makes, backed by Supabase.
 *
 * Deliberately shaped exactly like the generated API client they replace —
 * `listNodes()` and `syncNodes({ upserts, deletes })` — so `useNodes` only had
 * to change an import. Its offline queue, last-write-wins merge and store
 * switching are the highest-risk code in the project and were left alone.
 *
 * Row Level Security decides what a request may touch, so nothing here filters
 * by user: a plain select already returns exactly the rows this account owns or
 * has been sent. The policies are the security boundary, not this file.
 *
 * Position lives in its own table because the same shared entry sits in
 * different places on two people's maps. Reads stitch the two together; writes
 * split them apart again.
 */

interface NodeRow {
  id: string;
  user_id: string;
  shared_with: string | null;
  title: string;
  detail: string;
  kind: string;
  owner: string;
  status: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PositionRow {
  node_id: string;
  x: number;
  y: number;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireClient().auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

/**
 * Fallback placement for an entry this account has never positioned — one that
 * has just arrived from the other person. Derived from the id so it stays put
 * across reloads instead of jumping each time the page opens.
 */
function arrivalPosition(id: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  return { x: Math.round(Math.cos(angle) * 250), y: Math.round(Math.sin(angle) * 130) };
}

function toMindNode(row: NodeRow, pos: { x: number; y: number } | undefined): MindNode {
  const fallback = pos ?? arrivalPosition(row.id);
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    kind: row.kind as MindNode['kind'],
    owner: row.owner,
    status: row.status as MindNode['status'],
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    x: fallback.x,
    y: fallback.y,
    ownerId: row.user_id,
    sharedWith: row.shared_with,
  };
}

export async function listNodes(): Promise<MindNode[]> {
  const client = requireClient();
  const userId = await currentUserId();

  const [nodes, positions] = await Promise.all([
    client.from('nodes').select('*'),
    client.from('node_positions').select('node_id, x, y').eq('user_id', userId),
  ]);

  if (nodes.error) throw nodes.error;
  if (positions.error) throw positions.error;

  const byNode = new Map<string, { x: number; y: number }>();
  for (const p of (positions.data ?? []) as PositionRow[]) {
    byNode.set(p.node_id, { x: p.x, y: p.y });
  }

  return ((nodes.data ?? []) as NodeRow[]).map((row) => toMindNode(row, byNode.get(row.id)));
}

export async function syncNodes(body: { upserts: MindNode[]; deletes: string[] }): Promise<MindNode[]> {
  const client = requireClient();
  const userId = await currentUserId();
  const { upserts, deletes } = body;

  if (deletes.length > 0) {
    // RLS permits deleting only rows this account owns, so a stray id for
    // someone else's entry is refused by the database rather than trusted here.
    const { error } = await client.from('nodes').delete().in('id', deletes);
    if (error) throw error;
  }

  if (upserts.length > 0) {
    // Which of these already exist, and who owns them — an entry sent by the
    // other person is updated in place rather than re-inserted under this
    // account, which would both fail the insert policy and steal the row.
    const { data: existing, error: existingError } = await client
      .from('nodes')
      .select('id, user_id')
      .in('id', upserts.map((n) => n.id));
    if (existingError) throw existingError;

    const ownerById = new Map<string, string>(
      ((existing ?? []) as { id: string; user_id: string }[]).map((r) => [r.id, r.user_id]),
    );

    const mine = upserts.filter((n) => (ownerById.get(n.id) ?? userId) === userId);
    const theirs = upserts.filter((n) => ownerById.get(n.id) && ownerById.get(n.id) !== userId);

    if (mine.length > 0) {
      const { error } = await client.from('nodes').upsert(
        mine.map((n) => ({
          id: n.id,
          user_id: userId,
          title: n.title,
          detail: n.detail,
          kind: n.kind,
          owner: n.owner,
          status: n.status,
          parent_id: n.parentId,
          created_at: n.createdAt,
          updated_at: n.updatedAt,
        })),
        { onConflict: 'id' },
      );
      if (error) throw error;
    }

    // Content changes on an entry the other person owns. Their ownership and
    // who it is shared with are deliberately not in this update.
    for (const n of theirs) {
      const { error } = await client
        .from('nodes')
        .update({
          title: n.title,
          detail: n.detail,
          kind: n.kind,
          owner: n.owner,
          status: n.status,
          parent_id: n.parentId,
          updated_at: n.updatedAt,
        })
        .eq('id', n.id)
        // Last-write-wins, decided by the database: an edit that is already
        // stale when it lands must not overwrite a newer one from the other side.
        .lte('updated_at', n.updatedAt);
      if (error) throw error;
    }

    // Position is per person, so this row is always this account's own.
    const { error: posError } = await client.from('node_positions').upsert(
      upserts.map((n) => ({ node_id: n.id, user_id: userId, x: Math.round(n.x), y: Math.round(n.y) })),
      { onConflict: 'node_id,user_id' },
    );
    if (posError) throw posError;
  }

  return listNodes();
}

/**
 * Hand an entry to the other person. They see the same record — not a copy —
 * so whatever either of them changes afterwards shows on both maps.
 */
export async function shareNodeWith(nodeId: string, partnerId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('nodes')
    .update({ shared_with: partnerId, updated_at: new Date().toISOString() })
    .eq('id', nodeId);
  if (error) throw error;
}

/**
 * Hand it back. Called by the *recipient*, which is why it goes through a
 * database function rather than a plain update: the row policy re-checks the
 * row after the change, and a row that is no longer shared with you fails that
 * check — so the recipient cannot clear the column directly. The function runs
 * with the definer's rights and does the check itself, refusing anyone who is
 * not the current recipient.
 */
export async function returnSharedNode(nodeId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('return_shared_node', { p_node_id: nodeId });
  if (error) throw error;
}

/** Take it back: it stays on this account's map and leaves theirs. */
export async function unshareNode(nodeId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('nodes')
    .update({ shared_with: null, updated_at: new Date().toISOString() })
    .eq('id', nodeId);
  if (error) throw error;
}

/* ---- Attachments -------------------------------------------------------
   Metadata lives in its own table so it travels with a shared entry. Bytes
   are handled two different ways: demo pictures are files the app already
   serves, so only their URL needs storing, while anything a person uploads
   goes to Supabase Storage and is read back through a signed URL. */

interface AttachmentRow {
  id: string;
  node_id: string;
  kind: string;
  name: string;
  mime_type: string | null;
  size: number | null;
  url: string | null;
  asset_url: string | null;
  storage_path: string | null;
  created_at: string;
}

const BUCKET = 'attachments';

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    nodeId: row.node_id,
    kind: row.kind as Attachment['kind'],
    name: row.name,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    url: row.url ?? undefined,
    assetUrl: row.asset_url ?? undefined,
    createdAt: row.created_at,
    storagePath: row.storage_path ?? undefined,
  };
}

/**
 * Every attachment on an entry this account can see. RLS ties each row to its
 * entry, so a picture is visible exactly when the entry it belongs to is —
 * which is what makes an attachment travel with a shared item.
 */
export async function listAttachments(): Promise<Attachment[]> {
  const client = requireClient();
  const { data, error } = await client.from('attachments').select('*');
  if (error) throw error;
  return ((data ?? []) as AttachmentRow[]).map(rowToAttachment);
}

export async function putAttachment(attachment: Attachment, file?: File): Promise<Attachment> {
  const client = requireClient();
  const userId = await currentUserId();
  let storagePath = attachment.storagePath ?? null;

  if (file) {
    // Namespaced by uploader so one person's upload can never overwrite
    // another's, whatever the file happens to be called.
    storagePath = `${userId}/${attachment.id}-${file.name}`;
    const { error } = await client.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: true,
    });
    if (error) throw error;
  }

  const { error } = await client.from('attachments').upsert(
    {
      id: attachment.id,
      node_id: attachment.nodeId,
      kind: attachment.kind,
      name: attachment.name,
      mime_type: attachment.mimeType ?? null,
      size: attachment.size ?? null,
      url: attachment.url ?? null,
      asset_url: attachment.assetUrl ?? null,
      storage_path: storagePath,
      created_at: attachment.createdAt,
      uploaded_by: userId,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;

  return { ...attachment, storagePath: storagePath ?? undefined };
}

export async function removeAttachmentRow(attachment: Attachment): Promise<void> {
  const client = requireClient();
  if (attachment.storagePath) {
    // A failure here would only orphan bytes, so it must not stop the record
    // itself being removed — the record is what the person actually sees.
    await client.storage.from(BUCKET).remove([attachment.storagePath]).catch(() => undefined);
  }
  const { error } = await client.from('attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}

/** A time-limited URL for a stored file. The bucket itself stays private. */
export async function signedUrlFor(storagePath: string): Promise<string | null> {
  const client = requireClient();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Fires whenever a row this account can see changes. Returns an unsubscribe. */
export function subscribeToNodes(onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel('nodes-changes')
    // No filter: RLS already limits the stream to rows this account may see,
    // and a client-side filter could not be trusted anyway.
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments' }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
