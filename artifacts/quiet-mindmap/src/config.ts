/**
 * Product configuration.
 *
 * REQUIRE_SIGN_IN gates the whole app behind a Clerk account.
 *
 * While it is `false` the map opens straight away for anyone with the link and
 * their entries are stored locally in their own browser only — nothing they
 * type reaches the server or any other person's map. Signing in is still
 * available and still switches to the private, synced, cross-device map.
 *
 * Flip this to `true` to put the sign-in wall back in front of the app.
 */
export const REQUIRE_SIGN_IN = false;

/** Storage namespace used for visitors who have not signed in. */
export const GUEST_STORE_ID = 'guest';
