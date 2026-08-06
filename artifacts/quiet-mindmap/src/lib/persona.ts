/**
 * Demo personas: two people, two maps, one laptop.
 *
 * Opening the app with `?as=assistant` or `?as=director` gives that window its
 * own map — its own entries, orbs and attachments — because every local store
 * is already keyed by an id (see `useNodes`, `useOrbs`, `useAttachments`). The
 * persona simply supplies a different id than the plain guest one.
 *
 * Without the parameter nothing changes: one map, no partner, no sharing UI.
 * That path is the floor the product still has to work on.
 *
 * These ids are deliberately NOT `guest` — a real person's existing guest map
 * must stay exactly where it is and never mingle with demo content.
 */

import { GUEST_STORE_ID } from '../config';

export interface Persona {
  /** Storage id for this persona's own map. */
  id: string;
  name: string;
  /** The other person, or null when running without a persona. */
  partnerId: string | null;
  partnerName: string | null;
}

const ASSISTANT: Persona = {
  id: 'demo-assistant',
  name: 'Assistant',
  partnerId: 'demo-director',
  partnerName: 'Director',
};

const DIRECTOR: Persona = {
  id: 'demo-director',
  name: 'Director',
  partnerId: 'demo-assistant',
  partnerName: 'Assistant',
};

const SOLO: Persona = {
  id: GUEST_STORE_ID,
  name: 'You',
  partnerId: null,
  partnerName: null,
};

/** Per-tab, so each window keeps its identity across reloads independently. */
const SESSION_KEY = 'quiet-mindmap-persona';

/** Every per-store key the app writes, for the demo reset below. */
const STORE_KEY_PREFIXES = [
  'quiet-mindmap-nodes',
  'quiet-mindmap-seeded',
  'quiet-mindmap-pending',
  'quiet-mindmap-orbs',
  'quiet-mindmap-orb-assignments',
  'quiet-mindmap-attachments',
  'quiet-mindmap-attachments-seeded',
];

/**
 * Put the two demo maps back to their opening state — `?reset` on either
 * window. Rehearsing the demo means sending the same concern repeatedly, and
 * without this you would be hand-deleting entries between run-throughs.
 *
 * Scoped to the demo stores and the shared area. A real signed-out map under
 * `guest`, and anything belonging to a signed-in account, is never touched.
 */
export function resetDemoStores() {
  for (const storeId of [ASSISTANT.id, DIRECTOR.id]) {
    for (const prefix of STORE_KEY_PREFIXES) {
      localStorage.removeItem(`${prefix}:${storeId}`);
    }
  }
  // The shared area belongs to both of them, so it goes too.
  localStorage.removeItem('quiet-mindmap-shared');
}

function byKey(key: string | null | undefined): Persona | null {
  if (key === 'assistant') return ASSISTANT;
  if (key === 'director') return DIRECTOR;
  return null;
}

/**
 * Read once at module load rather than per-render: the persona is fixed for the
 * lifetime of the window, and re-reading it mid-session would mean a store
 * switch under the feet of code that assumes a stable identity.
 *
 * Remembered in sessionStorage because the app redirects `/` to `/map`, which
 * drops the query string — without this, a reload mid-demo would silently turn
 * both windows back into the same map. sessionStorage is per-tab, so the two
 * windows can hold different identities at the same time. `?as=solo` clears it.
 */
export const persona: Persona = (() => {
  if (typeof window === 'undefined') return SOLO;

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('as')?.toLowerCase();

  // Before anything reads a store, so the reload lands on a clean slate.
  if (params.has('reset')) {
    try {
      resetDemoStores();
    } catch {
      /* storage unavailable — nothing to reset anyway */
    }
  }

  if (requested === 'solo' || requested === 'me') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* private mode — fall through to SOLO anyway */
    }
    return SOLO;
  }

  const fromUrl = byKey(requested);
  if (fromUrl) {
    try {
      sessionStorage.setItem(SESSION_KEY, requested!);
    } catch {
      /* not fatal: the persona still holds until this tab navigates */
    }
    return fromUrl;
  }

  try {
    return byKey(sessionStorage.getItem(SESSION_KEY)) ?? SOLO;
  } catch {
    return SOLO;
  }
})();

/** True when this window is one of the two demo maps. */
export const isPersonaMode = persona.partnerId !== null;

/** Display name for a store id, for "Sent to …" labels on either side. */
export function personaNameFor(storeId: string): string {
  if (storeId === ASSISTANT.id) return ASSISTANT.name;
  if (storeId === DIRECTOR.id) return DIRECTOR.name;
  return 'You';
}

/**
 * The store id to use when nobody is signed in. Signed-in users keep their
 * Clerk id — personas are a signed-out demo device, not an account.
 */
export function guestStoreId(): string {
  return persona.id;
}
