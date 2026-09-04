import { applyPreference } from '../../data/filters';
import type { GenderPreference, NameEntry } from '../../data/types';
import type { Vote } from '../../storage';

export type QueueOrder = 'popularity' | 'shuffle';

export const ORDER_LABELS: Record<QueueOrder, string> = {
  popularity: 'Ordre de popularité',
  shuffle: 'Mélanger',
};

export const SHUFFLE_SEED_KEY = 'bnq.swipe.shuffleSeed';
export const ORDER_KEY = 'bnq.swipe.order';

/** FNV-1a hash turning an arbitrary seed string into a 32-bit integer. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG (mulberry32) returning numbers in [0, 1). */
export function createRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle that always yields the same permutation for a given seed. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const random = createRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createShuffleSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Every name allowed by the preference, sorted by popularity (most popular first). */
export function buildPool(names: readonly NameEntry[], preference: GenderPreference): NameEntry[] {
  return applyPreference([...names], preference).sort(
    (a, b) => a.popularityRank - b.popularityRank || a.name.localeCompare(b.name, 'fr'),
  );
}

/** Orders the pool once; removing voted names afterwards keeps the relative order stable. */
export function orderPool(
  pool: readonly NameEntry[],
  order: QueueOrder,
  seed: string,
): NameEntry[] {
  return order === 'shuffle' ? seededShuffle(pool, seed) : [...pool];
}

/** Names still to review: the ordered pool minus the names I already voted on. */
export function buildQueue(
  orderedPool: readonly NameEntry[],
  mine: ReadonlyMap<string, Vote>,
): NameEntry[] {
  return orderedPool.filter((entry) => !mine.has(entry.id));
}

/** The card on top: a name that was just undone comes back first, otherwise the head of the queue. */
export function pickCurrent(
  queue: readonly NameEntry[],
  pinnedId: string | null,
): NameEntry | null {
  if (pinnedId) {
    const pinned = queue.find((entry) => entry.id === pinnedId);
    if (pinned) return pinned;
  }
  return queue[0] ?? null;
}

export interface SwipeProgress {
  seen: number;
  total: number;
  /** 0–100, safe when the pool is empty. */
  percent: number;
}

/** How far the reviewer is through the pool matching the preference. */
export function computeProgress(
  pool: readonly NameEntry[],
  mine: ReadonlyMap<string, Vote>,
): SwipeProgress {
  let seen = 0;
  for (const entry of pool) if (mine.has(entry.id)) seen += 1;
  const total = pool.length;
  const percent = total === 0 ? 0 : Math.min(100, Math.round((seen / total) * 100));
  return { seen, total, percent };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readOrder(storage: Storage | null = safeStorage()): QueueOrder {
  try {
    return storage?.getItem(ORDER_KEY) === 'shuffle' ? 'shuffle' : 'popularity';
  } catch {
    return 'popularity';
  }
}

export function writeOrder(order: QueueOrder, storage: Storage | null = safeStorage()): void {
  try {
    storage?.setItem(ORDER_KEY, order);
  } catch {
    // Private mode or full storage: the choice simply will not survive a reload.
  }
}

/** Returns the stored seed, creating and persisting one on first use so reloads keep the order. */
export function readShuffleSeed(storage: Storage | null = safeStorage()): string {
  try {
    const existing = storage?.getItem(SHUFFLE_SEED_KEY);
    if (existing) return existing;
    const created = createShuffleSeed();
    storage?.setItem(SHUFFLE_SEED_KEY, created);
    return created;
  } catch {
    return createShuffleSeed();
  }
}
