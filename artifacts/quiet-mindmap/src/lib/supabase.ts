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
 * The two demo people: their accounts and the names shown on screen.
 *
 * **Change a name here and it changes everywhere** — the badge, the Send
 * button, the panel wording and the signed-out personas all read from this one
 * place, so renaming is a one-line edit rather than a hunt.
 *
 * A real product would read pairings from a table; for two people a constant is
 * honest and has no failure mode of its own.
 */
export const DEMO_PEOPLE = {
  assistant: { id: '379898db-aeb8-41ef-8f8b-b47de350f604', name: 'Raghad' },
  director: { id: 'b494e356-111b-4540-b26e-6c6922cdae82', name: 'Mansour' },
} as const;

export const DEMO_ACCOUNTS = {
  assistant: DEMO_PEOPLE.assistant.id,
  director: DEMO_PEOPLE.director.id,
} as const;

/** The other person's user id, or null for anyone outside the demo pair. */
export function partnerOf(userId: string | null): string | null {
  if (userId === DEMO_ACCOUNTS.assistant) return DEMO_ACCOUNTS.director;
  if (userId === DEMO_ACCOUNTS.director) return DEMO_ACCOUNTS.assistant;
  return null;
}

/** Display name for a user id, for "Send to …" and arrival labels. */
export function accountName(userId: string | null): string {
  if (userId === DEMO_PEOPLE.assistant.id) return DEMO_PEOPLE.assistant.name;
  if (userId === DEMO_PEOPLE.director.id) return DEMO_PEOPLE.director.name;
  return 'Them';
}
