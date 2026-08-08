import { describe, it, expect } from 'vitest';
import { mergeServer } from './useNodes';
import type { MindNode } from '../types';

/**
 * The merge is where a badly-timed arrival turns into lost work: it runs on
 * every pull, and a pull now happens on every change the other account makes
 * and on a timer besides. What it must never do is undo something the person
 * is in the middle of.
 */

const AT = '2026-08-06T10:00:00.000Z';
const LATER = '2026-08-06T10:05:00.000Z';

function node(overrides: Partial<MindNode> = {}): MindNode {
  return {
    id: 'n1',
    title: 'Budget review delay',
    detail: 'Finance need another week.',
    kind: 'urgent',
    owner: 'Finance',
    status: 'open',
    parentId: null,
    createdAt: AT,
    updatedAt: AT,
    x: 10,
    y: 20,
    ...overrides,
  };
}

const nothingPending = { upserts: [] as string[], deletes: [] as string[] };

describe('mergeServer', () => {
  it('takes the server copy when nothing is pending locally', () => {
    const merged = mergeServer([node({ title: 'Renamed' })], [node()], nothingPending);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Renamed');
  });

  it('keeps a queued local edit that is newer than the server copy', () => {
    const merged = mergeServer(
      [node({ title: 'Server' })],
      [node({ title: 'Mine', updatedAt: LATER })],
      { upserts: ['n1'], deletes: [] },
    );
    expect(merged[0].title).toBe('Mine');
  });

  it('drops a local entry the server no longer has, unless it is still queued', () => {
    expect(mergeServer([], [node()], nothingPending)).toHaveLength(0);
    expect(mergeServer([], [node()], { upserts: ['n1'], deletes: [] })).toHaveLength(1);
  });

  it('hides an entry queued for deletion even though the server still has it', () => {
    const merged = mergeServer([node()], [node()], { upserts: [], deletes: ['n1'] });
    expect(merged).toHaveLength(0);
  });

  it('adds an entry the other account just shared', () => {
    const arrival = node({ id: 'n2', title: 'Sent to you', sharedWith: 'me' });
    const merged = mergeServer([node(), arrival], [node()], nothingPending);
    expect(merged.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('holds the position of an entry being dragged right now', () => {
    // Mid-drag the new position is state-only — it is not queued until the
    // pointer comes up, so nothing else protects it from the server's copy.
    const merged = mergeServer(
      [node({ x: 10, y: 20 })],
      [node({ x: 400, y: 300 })],
      nothingPending,
      new Set(['n1']),
    );
    expect(merged[0]).toMatchObject({ x: 400, y: 300 });
  });

  it("still applies the other account's edits to an entry being dragged", () => {
    const merged = mergeServer(
      [node({ title: 'They renamed it', updatedAt: LATER })],
      [node({ x: 400, y: 300 })],
      nothingPending,
      new Set(['n1']),
    );
    expect(merged[0]).toMatchObject({ title: 'They renamed it', x: 400, y: 300 });
  });

  it('leaves entries that are not being dragged alone', () => {
    const merged = mergeServer([node()], [node({ x: 400, y: 300 })], nothingPending, new Set(['other']));
    expect(merged[0]).toMatchObject({ x: 10, y: 20 });
  });
});
