import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { resolveIdentity } from '../lib/people';

/**
 * Supabase session state, shaped like the Clerk hook it replaces so the call
 * sites did not have to change: `{ user, isLoaded, isSignedIn }`.
 *
 * `isLoaded` matters more than it looks. Everything store-scoped — entries,
 * orbs, attachments, sharing — keys off the user id, and committing to a store
 * before the session has resolved would write a signed-in person's entries into
 * the guest bucket. Callers must keep treating "not loaded yet" as "do nothing".
 */

interface AuthUser {
  id: string;
  email: string | null;
}

let cachedSession: Session | null = null;
let resolvedOnce = false;

export function useUser() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  // Without a backend there is nothing to wait for: report loaded immediately
  // so guest mode is not stuck behind a session that will never arrive.
  const [isLoaded, setIsLoaded] = useState(!supabase || resolvedOnce);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      cachedSession = data.session;
      resolvedOnce = true;
      setSession(data.session);
      setIsLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      cachedSession = next;
      resolvedOnce = true;
      setSession(next);
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: AuthUser | null = session?.user
    ? { id: session.user.id, email: session.user.email ?? null }
    : null;

  // Teach the app which account is which, from the one thing a human can
  // verify. Everything that names a person or picks starting content reads the
  // result, so this has to happen before any of it renders.
  if (user) resolveIdentity(user.id, user.email);

  return { user, isLoaded, isSignedIn: !!user };
}

export type AuthResult = { ok: true } | { ok: false; message: string };

/** Sign in / sign up / sign out, each returning a message rather than throwing. */
export function useAuthActions() {
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'No account backend is configured.' };
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, message: friendly(error.message) };
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'No account backend is configured.' };
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { ok: false, message: friendly(error.message) };
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { signIn, signUp, signOut, busy };
}

/** Supabase's wording is aimed at developers; this is aimed at the person. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password do not match.';
  if (m.includes('email not confirmed')) return 'That account still needs its email confirmed.';
  if (m.includes('already registered')) return 'That email already has an account — sign in instead.';
  if (m.includes('password should be')) return 'Passwords need at least six characters.';
  if (m.includes('failed to fetch')) return 'Could not reach the server. Check the connection.';
  return message;
}
