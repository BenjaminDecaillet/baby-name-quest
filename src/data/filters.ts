import { popularityBucket, type PopularityBucket } from './popularity';
import type { Gender, GenderPreference, NameEntry, Trend } from './types';

export type SortKey = 'popularity' | 'alpha' | 'length' | 'trend';

export interface NameFilters {
  query: string;
  genders: Gender[];
  letters: string[];
  minLength: number | null;
  maxLength: number | null;
  popularity: PopularityBucket[];
  trends: Trend[];
  origins: string[];
  sort: SortKey;
}

export const EMPTY_FILTERS: NameFilters = {
  query: '',
  genders: [],
  letters: [],
  minLength: null,
  maxLength: null,
  popularity: [],
  trends: [],
  origins: [],
  sort: 'popularity',
};

export const SORT_LABELS: Record<SortKey, string> = {
  popularity: 'Popularité',
  alpha: 'Alphabétique',
  length: 'Longueur',
  trend: 'Tendance',
};

/** Lowercase, accent-free form used for search matching. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Names allowed by the couple's gender preference (mixed names always pass). */
export function matchesPreference(entry: NameEntry, preference: GenderPreference): boolean {
  if (preference === 'both') return true;
  return entry.gender === preference || entry.gender === 'x';
}

export function applyPreference(entries: NameEntry[], preference: GenderPreference): NameEntry[] {
  if (preference === 'both') return entries;
  return entries.filter((entry) => matchesPreference(entry, preference));
}

export function matchesFilters(
  entry: NameEntry,
  filters: NameFilters,
  query = normalizeForSearch(filters.query),
): boolean {
  if (query && !normalizeForSearch(entry.name).includes(query)) return false;
  if (filters.genders.length > 0 && !filters.genders.includes(entry.gender)) return false;
  if (filters.letters.length > 0 && !filters.letters.includes(entry.firstLetter)) return false;
  if (filters.minLength !== null && entry.length < filters.minLength) return false;
  if (filters.maxLength !== null && entry.length > filters.maxLength) return false;
  if (filters.popularity.length > 0 && !filters.popularity.includes(popularityBucket(entry)))
    return false;
  if (filters.trends.length > 0 && !filters.trends.includes(entry.trend)) return false;
  if (filters.origins.length > 0 && (!entry.origin || !filters.origins.includes(entry.origin)))
    return false;
  return true;
}

const TREND_ORDER: Record<Trend, number> = { up: 0, stable: 1, down: 2 };
const collator = new Intl.Collator('fr', { sensitivity: 'base' });

export function compareNames(a: NameEntry, b: NameEntry, sort: SortKey): number {
  switch (sort) {
    case 'alpha':
      return collator.compare(a.name, b.name) || a.popularityRank - b.popularityRank;
    case 'length':
      return a.length - b.length || a.popularityRank - b.popularityRank;
    case 'trend':
      return TREND_ORDER[a.trend] - TREND_ORDER[b.trend] || a.popularityRank - b.popularityRank;
    case 'popularity':
    default:
      return a.popularityRank - b.popularityRank;
  }
}

export function filterAndSort(entries: NameEntry[], filters: NameFilters): NameEntry[] {
  const query = normalizeForSearch(filters.query);
  const result = entries.filter((entry) => matchesFilters(entry, filters, query));
  // A search that starts with the query is more relevant than a mere inclusion.
  if (query) {
    result.sort((a, b) => {
      const aStarts = normalizeForSearch(a.name).startsWith(query) ? 0 : 1;
      const bStarts = normalizeForSearch(b.name).startsWith(query) ? 0 : 1;
      return aStarts - bStarts || compareNames(a, b, filters.sort);
    });
  } else {
    result.sort((a, b) => compareNames(a, b, filters.sort));
  }
  return result;
}

export function countActiveFilters(filters: NameFilters): number {
  let count = 0;
  if (filters.genders.length > 0) count += 1;
  if (filters.letters.length > 0) count += 1;
  if (filters.minLength !== null || filters.maxLength !== null) count += 1;
  if (filters.popularity.length > 0) count += 1;
  if (filters.trends.length > 0) count += 1;
  if (filters.origins.length > 0) count += 1;
  return count;
}

/** Distinct origins present in the dataset, most frequent first. */
export function listOrigins(entries: NameEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.origin) counts.set(entry.origin, (counts.get(entry.origin) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))
    .map(([origin]) => origin);
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
