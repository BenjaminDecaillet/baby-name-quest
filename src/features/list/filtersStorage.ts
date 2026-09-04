import {
  EMPTY_FILTERS,
  LETTERS,
  SORT_LABELS,
  type NameFilters,
  type SortKey,
} from '../../data/filters';
import { POPULARITY_BUCKETS, type PopularityBucket } from '../../data/popularity';
import type { Gender, Trend } from '../../data/types';

export const FILTERS_STORAGE_KEY = 'bnq.list.filters';

const GENDERS: readonly Gender[] = ['f', 'm', 'x'];
const TRENDS: readonly Trend[] = ['up', 'stable', 'down'];
const BUCKETS: readonly PopularityBucket[] = POPULARITY_BUCKETS.map((bucket) => bucket.id);
const MAX_QUERY_LENGTH = 50;
const MAX_NAME_LENGTH = 40;

/** Keeps the unique string items of `value`, optionally restricted to `allowed`. */
function stringList<T extends string>(value: unknown, allowed?: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  const result: T[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const candidate = item as T;
    if (allowed && !allowed.includes(candidate)) continue;
    if (!result.includes(candidate)) result.push(candidate);
  }
  return result;
}

function optionalLength(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 1 || value > MAX_NAME_LENGTH) return null;
  return value;
}

/** Coerces any parsed value into a well-formed `NameFilters`, dropping unknown entries. */
export function sanitizeFilters(input: unknown): NameFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ...EMPTY_FILTERS };
  const raw = input as Record<string, unknown>;
  let minLength = optionalLength(raw.minLength);
  let maxLength = optionalLength(raw.maxLength);
  if (minLength !== null && maxLength !== null && minLength > maxLength) {
    [minLength, maxLength] = [maxLength, minLength];
  }
  const sort: SortKey =
    typeof raw.sort === 'string' && raw.sort in SORT_LABELS
      ? (raw.sort as SortKey)
      : EMPTY_FILTERS.sort;
  return {
    query: typeof raw.query === 'string' ? raw.query.slice(0, MAX_QUERY_LENGTH) : '',
    genders: stringList(raw.genders, GENDERS),
    letters: stringList(raw.letters, LETTERS),
    minLength,
    maxLength,
    popularity: stringList(raw.popularity, BUCKETS),
    trends: stringList(raw.trends, TRENDS),
    origins: stringList(raw.origins).slice(0, 50),
    sort,
  };
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Filters saved on this device, or the empty filters when nothing usable is stored. */
export function readStoredFilters(storage: Storage | null = defaultStorage()): NameFilters {
  if (!storage) return { ...EMPTY_FILTERS };
  try {
    const raw = storage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    return sanitizeFilters(JSON.parse(raw));
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function writeStoredFilters(
  filters: NameFilters,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Private mode or full storage: filters simply will not survive a reload.
  }
}
