import { describe, it, expect } from 'vitest';
import type { MindNode } from '../types';
import {
  followersOf,
  rootAnchorOf,
  slotPosition,
  findStickTarget,
  SLOT_WIDTH,
  type StickMap,
} from './stick';

function node(id: string, x: number, y: number): MindNode {
  return {
    id,
    title: id,
    detail: '',
    kind: 'task',
    owner: '',
    status: 'open',
    parentId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    x,
    y,
  };
}

describe('followersOf', () => {
  it('finds what is stuck directly to an entry', () => {
    const sticks: StickMap = { b: 'a' };
    expect(followersOf(sticks, 'a')).toEqual(['b']);
  });

  it('follows the chain, so a whole row travels together', () => {
    const sticks: StickMap = { b: 'a', c: 'b', d: 'c' };
    expect(followersOf(sticks, 'a').sort()).toEqual(['b', 'c', 'd']);
  });

  it('returns nothing for a loose entry', () => {
    expect(followersOf({ b: 'a' }, 'z')).toEqual([]);
  });

  it('terminates on a cycle rather than hanging the drag', () => {
    // Not reachable through the UI, but a corrupted store must not spin forever.
    const sticks: StickMap = { a: 'b', b: 'a' };
    expect(followersOf(sticks, 'a')).toEqual(['b']);
  });
});

describe('rootAnchorOf', () => {
  it('walks up to the head of the row', () => {
    expect(rootAnchorOf({ c: 'b', b: 'a' }, 'c')).toBe('a');
  });

  it('returns the entry itself when it is loose', () => {
    expect(rootAnchorOf({}, 'a')).toBe('a');
  });

  it('terminates on a cycle', () => {
    expect(rootAnchorOf({ a: 'b', b: 'a' }, 'a')).toBe('b');
  });
});

describe('slotPosition', () => {
  const anchor = node('anchor', 100, 50);

  it('places a drop on the right-hand side to the right', () => {
    expect(slotPosition(anchor, 180, [])).toEqual({ x: 100 + SLOT_WIDTH, y: 50 });
  });

  it('places a drop on the left-hand side to the left', () => {
    expect(slotPosition(anchor, 20, [])).toEqual({ x: 100 - SLOT_WIDTH, y: 50 });
  });

  it('shares the anchor row, so the two line up', () => {
    expect(slotPosition(anchor, 180, []).y).toBe(anchor.y);
  });

  it('steps past a slot that is already taken', () => {
    expect(slotPosition(anchor, 180, [SLOT_WIDTH])).toEqual({ x: 100 + SLOT_WIDTH * 2, y: 50 });
  });

  it('counts sides independently', () => {
    // One already stuck on the right must not push the next left-hand drop out.
    expect(slotPosition(anchor, 20, [SLOT_WIDTH])).toEqual({ x: 100 - SLOT_WIDTH, y: 50 });
  });
});

describe('findStickTarget', () => {
  const nodes = [node('a', 0, 0), node('b', 500, 0)];

  it('finds an entry dropped close enough', () => {
    expect(findStickTarget('dragged', { x: 40, y: 10 }, nodes, {})?.id).toBe('a');
  });

  it('ignores a drop in open space', () => {
    expect(findStickTarget('dragged', { x: 250, y: 250 }, nodes, {})).toBeNull();
  });

  it('picks the nearer of two candidates', () => {
    const close = [node('a', 0, 0), node('b', 60, 0)];
    expect(findStickTarget('dragged', { x: 50, y: 0 }, close, {})?.id).toBe('b');
  });

  it('never sticks a row to itself', () => {
    const row = [node('a', 0, 0), node('b', 40, 0)];
    // 'b' is stuck to 'a', so dragging 'a' over 'b' must not chain them.
    expect(findStickTarget('a', { x: 40, y: 0 }, row, { b: 'a' })).toBeNull();
  });

  it('excludes the dragged entry itself', () => {
    expect(findStickTarget('a', { x: 0, y: 0 }, nodes, {})).toBeNull();
  });
});
