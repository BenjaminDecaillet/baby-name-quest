import { beforeEach, describe, expect, it } from 'vitest';
import type { NameEntry } from '../../data/types';
import type { Vote } from '../../storage';
import {
  ORDER_KEY,
  SHUFFLE_SEED_KEY,
  buildPool,
  buildQueue,
  computeProgress,
  createRandom,
  hashSeed,
  orderPool,
  pickCurrent,
  readOrder,
  readShuffleSeed,
  seededShuffle,
  writeOrder,
} from './swipeQueue';

function entry(id: string, gender: NameEntry['gender'], popularityRank: number): NameEntry {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    gender,
    countFR: 1000,
    countCH: 100,
    recentFR: 100,
    recentCH: 10,
    popularityRank,
    trend: 'stable',
    firstLetter: id.charAt(0).toUpperCase(),
    length: id.length,
  };
}

function vote(nameId: string, value: Vote['value'] = 'like'): [string, Vote] {
  return [
    nameId,
    { profileId: 'p1', nameId, value, note: null, updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
}

const NAMES: NameEntry[] = [
  entry('louis', 'm', 2),
  entry('emma', 'f', 1),
  entry('camille', 'x', 3),
  entry('jade', 'f', 4),
  entry('gabriel', 'm', 5),
];

describe('buildPool', () => {
  it('applies the gender preference and sorts by popularity', () => {
    expect(buildPool(NAMES, 'both').map((item) => item.id)).toEqual([
      'emma',
      'louis',
      'camille',
      'jade',
      'gabriel',
    ]);
    expect(buildPool(NAMES, 'f').map((item) => item.id)).toEqual(['emma', 'camille', 'jade']);
    expect(buildPool(NAMES, 'm').map((item) => item.id)).toEqual(['louis', 'camille', 'gabriel']);
  });

  it('does not mutate the input', () => {
    const copy = [...NAMES];
    buildPool(NAMES, 'both');
    expect(NAMES).toEqual(copy);
  });
});

describe('buildQueue', () => {
  it('removes the names I already voted on, whatever the value', () => {
    const pool = buildPool(NAMES, 'both');
    const mine = new Map([vote('emma', 'like'), vote('camille', 'skip')]);
    expect(buildQueue(pool, mine).map((item) => item.id)).toEqual(['louis', 'jade', 'gabriel']);
  });

  it('keeps the relative shuffled order when names get voted on', () => {
    const pool = buildPool(NAMES, 'both');
    const shuffled = orderPool(pool, 'shuffle', 'seed-1').map((item) => item.id);
    const remaining = buildQueue(
      orderPool(pool, 'shuffle', 'seed-1'),
      new Map([vote(shuffled[0])]),
    );
    expect(remaining.map((item) => item.id)).toEqual(shuffled.slice(1));
  });
});

describe('seededShuffle', () => {
  const items = Array.from({ length: 50 }, (_, index) => index);

  it('is deterministic for a given seed and is a permutation', () => {
    const first = seededShuffle(items, 'stable-seed');
    const second = seededShuffle(items, 'stable-seed');
    expect(first).toEqual(second);
    expect([...first].sort((a, b) => a - b)).toEqual(items);
    expect(first).not.toEqual(items);
  });

  it('changes with the seed', () => {
    expect(seededShuffle(items, 'seed-a')).not.toEqual(seededShuffle(items, 'seed-b'));
  });

  it('handles empty and single-element lists', () => {
    expect(seededShuffle([], 'x')).toEqual([]);
    expect(seededShuffle(['only'], 'x')).toEqual(['only']);
  });

  it('hashes seeds to stable 32-bit integers and yields numbers in [0, 1)', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
    const random = createRandom('abc');
    for (let index = 0; index < 100; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('pickCurrent', () => {
  const queue = buildPool(NAMES, 'both');

  it('returns the head of the queue by default', () => {
    expect(pickCurrent(queue, null)?.id).toBe('emma');
  });

  it('puts an undone name back on top when it is still in the queue', () => {
    expect(pickCurrent(queue, 'jade')?.id).toBe('jade');
    expect(pickCurrent(queue, 'unknown')?.id).toBe('emma');
  });

  it('returns null on an empty queue', () => {
    expect(pickCurrent([], 'jade')).toBeNull();
  });
});

describe('computeProgress', () => {
  it('counts only the votes belonging to the pool', () => {
    const pool = buildPool(NAMES, 'f');
    const mine = new Map([vote('emma'), vote('louis', 'skip'), vote('jade', 'skip')]);
    expect(computeProgress(pool, mine)).toEqual({ seen: 2, total: 3, percent: 67 });
  });

  it('is safe on an empty pool', () => {
    expect(computeProgress([], new Map())).toEqual({ seen: 0, total: 0, percent: 0 });
  });
});

describe('persistence helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to popularity and remembers the chosen order', () => {
    expect(readOrder()).toBe('popularity');
    writeOrder('shuffle');
    expect(window.localStorage.getItem(ORDER_KEY)).toBe('shuffle');
    expect(readOrder()).toBe('shuffle');
  });

  it('creates the shuffle seed once and reuses it', () => {
    const seed = readShuffleSeed();
    expect(seed.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(SHUFFLE_SEED_KEY)).toBe(seed);
    expect(readShuffleSeed()).toBe(seed);
  });

  it('survives an unavailable storage', () => {
    expect(readOrder(null)).toBe('popularity');
    expect(() => writeOrder('shuffle', null)).not.toThrow();
    expect(readShuffleSeed(null).length).toBeGreaterThan(0);
  });
});
