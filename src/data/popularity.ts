import type { NameEntry } from './types';

export type PopularityBucket = 'classic' | 'common' | 'original' | 'rare';

export const POPULARITY_BUCKETS: Array<{ id: PopularityBucket; label: string; hint: string }> = [
  { id: 'classic', label: 'Classiques', hint: 'Top 100' },
  { id: 'common', label: 'Courants', hint: '101 à 500' },
  { id: 'original', label: 'Originaux', hint: '501 à 2 000' },
  { id: 'rare', label: 'Rares', hint: 'Au-delà de 2 000' },
];

export function popularityBucket(entry: Pick<NameEntry, 'popularityRank'>): PopularityBucket {
  const rank = entry.popularityRank;
  if (rank <= 100) return 'classic';
  if (rank <= 500) return 'common';
  if (rank <= 2000) return 'original';
  return 'rare';
}

export function popularityLabel(entry: Pick<NameEntry, 'popularityRank'>): string {
  return POPULARITY_BUCKETS.find((bucket) => bucket.id === popularityBucket(entry))?.label ?? '';
}

const formatter = new Intl.NumberFormat('fr-CH');

/** Human readable count, e.g. « 12 345 ». */
export function formatCount(value: number): string {
  return formatter.format(value);
}
