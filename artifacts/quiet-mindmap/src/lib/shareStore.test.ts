import { describe, it, expect } from 'vitest';
import { visibleTo, toNode, type SharedMap, type SharedRecord } from './shareStore';

const ASSISTANT = 'demo-assistant';
const DIRECTOR = 'demo-director';
const OUTSIDER = 'someone-else';

function record(overrides: Partial<SharedRecord> = {}): SharedRecord {
  return {
    id: 'n1',
    ownerId: ASSISTANT,
    sharedWith: DIRECTOR,
    content: {
      id: 'n1',
      title: 'Budget review delay',
      detail: 'Finance need another week.',
      kind: 'urgent',
      owner: 'Finance',
      status: 'open',
      parentId: null,
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-01T09:00:00.000Z',
    },
    positions: { [ASSISTANT]: { x: 10, y: 20 } },
    ...overrides,
  };
}

const map = (...records: SharedRecord[]): SharedMap =>
  Object.fromEntries(records.map((r) => [r.id, r]));

describe('visibleTo', () => {
  it('shows an item to the person who sent it', () => {
    expect(visibleTo(map(record()), ASSISTANT)).toHaveLength(1);
  });

  it('shows an item to the person it was sent to', () => {
    expect(visibleTo(map(record()), DIRECTOR)).toHaveLength(1);
  });

  it('hides it from everyone else — this is the whole privacy guarantee', () => {
    expect(visibleTo(map(record()), OUTSIDER)).toEqual([]);
  });

  it('returns only the records that involve the viewer', () => {
    const mine = record({ id: 'mine' });
    const theirs = record({ id: 'theirs', ownerId: OUTSIDER, sharedWith: OUTSIDER });
    const visible = visibleTo(map(mine, theirs), ASSISTANT);
    expect(visible.map((r) => r.id)).toEqual(['mine']);
  });
});

describe('toNode', () => {
  const fallback = { x: 999, y: 999 };

  it("uses the viewer's own position", () => {
    const node = toNode(record(), ASSISTANT, fallback);
    expect({ x: node.x, y: node.y }).toEqual({ x: 10, y: 20 });
  });

  it('falls back to the arrival spot for someone who has never placed it', () => {
    const node = toNode(record(), DIRECTOR, fallback);
    expect({ x: node.x, y: node.y }).toEqual(fallback);
  });

  it('gives both people the same content but different geometry', () => {
    const r = record({ positions: { [ASSISTANT]: { x: 1, y: 2 }, [DIRECTOR]: { x: 300, y: 400 } } });
    const hers = toNode(r, ASSISTANT, fallback);
    const his = toNode(r, DIRECTOR, fallback);

    expect(his.title).toBe(hers.title);
    expect(his.status).toBe(hers.status);
    expect({ x: his.x, y: his.y }).not.toEqual({ x: hers.x, y: hers.y });
  });

  it('carries a status change through to the other person — one record, not two copies', () => {
    const handled = record({ content: { ...record().content, status: 'handled' } });
    expect(toNode(handled, DIRECTOR, fallback).status).toBe('handled');
    expect(toNode(handled, ASSISTANT, fallback).status).toBe('handled');
  });

  it('produces a node with no leftover sharing fields on it', () => {
    const node = toNode(record(), ASSISTANT, fallback);
    expect(node).not.toHaveProperty('ownerId');
    expect(node).not.toHaveProperty('sharedWith');
    expect(node).not.toHaveProperty('positions');
  });
});
