/**
 * Who the two demo accounts are.
 *
 * Roles are keyed by **email**, not by user id, because an id is opaque — the
 * pairing was previously written down by hand and got the two the wrong way
 * round, which silently gave each person the other's starting content. Email is
 * the thing a human can actually check.
 *
 * The ids are still needed (the `shared_with` column stores one), so the first
 * signed-in session resolves id → role from its own email and remembers it. The
 * partner is simply the other id of the known pair, which needs no guesswork at
 * all.
 */

export type Role = 'assistant' | 'director';

/** Change a name here and it changes everywhere it is shown. */
export const ROLE_NAMES: Record<Role, string> = {
  assistant: 'Raghad',
  director: 'Mansour',
};

const ROLE_BY_EMAIL: Record<string, Role> = {
  'artraitoruk@gmail.com': 'assistant',
  'artraitor@gmail.com': 'director',
};

/** The two account ids, in no particular order — roles are resolved, not assumed. */
export const ACCOUNT_IDS = [
  '379898db-aeb8-41ef-8f8b-b47de350f604',
  'b494e356-111b-4540-b26e-6c6922cdae82',
] as const;

const STORAGE_KEY = 'quiet-mindmap-roles';

/** id → role, learned from whoever has signed in on this browser. */
let roleById: Record<string, Role> = load();

function load(): Record<string, Role> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Role>) : {};
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roleById));
  } catch {
    /* private mode — the mapping still holds for this session */
  }
}

/**
 * Called once a session is known. Records this account's role from its email,
 * and infers the other account's by elimination — with exactly two accounts,
 * knowing one settles both.
 */
export function resolveIdentity(userId: string, email: string | null) {
  const role = email ? ROLE_BY_EMAIL[email.trim().toLowerCase()] : undefined;
  if (!role) return;

  const other = ACCOUNT_IDS.find((id) => id !== userId);
  const next: Record<string, Role> = { ...roleById, [userId]: role };
  if (other) next[other] = role === 'assistant' ? 'director' : 'assistant';

  // Only write when something actually changed, so this can be called on every
  // session render without churning storage.
  if (JSON.stringify(next) === JSON.stringify(roleById)) return;
  roleById = next;
  save();
}

export function roleOf(userId: string | null | undefined): Role | null {
  if (!userId) return null;
  return roleById[userId] ?? null;
}

/** Display name for an account id, once its role is known. */
export function nameOfAccount(userId: string | null): string {
  const role = roleOf(userId);
  return role ? ROLE_NAMES[role] : 'Them';
}

/**
 * The other person's account id. Derived from the known pair rather than from
 * roles, so it is correct even before an email has been seen.
 */
export function partnerIdOf(userId: string | null): string | null {
  if (!userId || !ACCOUNT_IDS.includes(userId as (typeof ACCOUNT_IDS)[number])) return null;
  return ACCOUNT_IDS.find((id) => id !== userId) ?? null;
}
