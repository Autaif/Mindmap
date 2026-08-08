import { describe, it, expect } from 'vitest';
import { seedsFor, seedAttachmentsFor, ASSISTANT_STORE_ID, DIRECTOR_STORE_ID } from './seeds';

/**
 * Seed content is edited by hand and never type-checked against itself: an
 * attachment names its entry by id, in a different list, so removing an entry
 * silently leaves its pictures pointing at nothing. Signed in that is not
 * cosmetic — the insert policy requires the entry to exist, so an orphaned
 * picture is rejected by the database and retried on every sync, forever.
 */

const MAPS = [
  ['Raghad', ASSISTANT_STORE_ID],
  ['Mansour', DIRECTOR_STORE_ID],
] as const;

/** Every entry on a map, parents and children alike. */
function nodeIdsOf(storeId: string): string[] {
  return seedsFor(storeId).flatMap((spec) => [spec.id, ...(spec.children ?? []).map((c) => c.id)]);
}

describe.each(MAPS)("%s's starting map", (_name, storeId) => {
  it('has no attachment pointing at an entry that does not exist', () => {
    const ids = new Set(nodeIdsOf(storeId));
    const orphans = seedAttachmentsFor(storeId).filter((a) => !ids.has(a.nodeId));
    expect(orphans.map((a) => `${a.id} -> ${a.nodeId}`)).toEqual([]);
  });

  it('gives every entry at least one attachment', () => {
    const withPictures = new Set(seedAttachmentsFor(storeId).map((a) => a.nodeId));
    const bare = nodeIdsOf(storeId).filter((id) => !withPictures.has(id));
    expect(bare).toEqual([]);
  });

  it('uses each attachment id once', () => {
    // They are primary keys server-side, so a duplicate is one row overwriting
    // another rather than two pictures.
    const ids = seedAttachmentsFor(storeId).map((a) => a.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it('gives each entry its own id', () => {
    const ids = nodeIdsOf(storeId);
    expect(ids).toHaveLength(new Set(ids).size);
  });
});

describe('the two demo maps', () => {
  it('do not show the same entries as each other', () => {
    const shared = nodeIdsOf(ASSISTANT_STORE_ID).filter((id) =>
      nodeIdsOf(DIRECTOR_STORE_ID).includes(id),
    );
    expect(shared).toEqual([]);
  });

  it("keeps Mansour's map the shorter of the two", () => {
    // The contrast is the point of putting them side by side: his map is what
    // only he can settle, hers is everything that has been raised with her.
    expect(nodeIdsOf(DIRECTOR_STORE_ID).length).toBeLessThan(nodeIdsOf(ASSISTANT_STORE_ID).length);
  });
});
