import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client, and the one place that knows the two demo accounts.
 *
 * The anon key is public by design — it identifies the project, it does not
 * grant anything. Every table has Row Level Security, so what a request may
 * read or write is decided by the signed-in user's own token, server side. The
 * `service_role` key must never appear in this file or anywhere else the
 * browser can reach: it bypasses RLS completely.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the app is running without a backend — guest mode still works. */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The demo runs two accounts side by side in one browser. Without a
        // per-window storage key both windows would share one session and the
        // second sign-in would silently replace the first.
        storageKey: `sb-mindmap-auth-${windowScope()}`,
      },
    })
  : null;

/**
 * A stable id for this tab, so two windows can hold different sessions.
 * sessionStorage is per-tab, which is exactly the scope wanted here.
 */
function windowScope(): string {
  try {
    const existing = sessionStorage.getItem('quiet-mindmap-window');
    if (existing) return existing;
    const id = Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('quiet-mindmap-window', id);
    return id;
  } catch {
    return 'default';
  }
}

/**
 * Who each account is lives in `lib/people` — keyed by email and resolved at
 * sign-in, rather than a hand-written id → person table that can be, and was,
 * written down backwards.
 */
export { ACCOUNT_IDS, ROLE_NAMES, roleOf, nameOfAccount, partnerIdOf, resolveIdentity } from './people';

/** The other person's user id, or null for anyone outside the demo pair. */
export { partnerIdOf as partnerOf } from './people';

/** Display name for a user id, for "Send to …" and arrival labels. */
export { nameOfAccount as accountName } from './people';
