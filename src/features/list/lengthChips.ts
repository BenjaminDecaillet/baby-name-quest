import type { NameFilters } from '../../data/filters';

export type LengthChipId = 'short' | 'medium' | 'long' | 'extraLong';

export interface LengthChip {
  id: LengthChipId;
  label: string;
  min: number | null;
  max: number | null;
}

/** Disjoint length ranges offered as chips (easier than number inputs on a phone). */
export const LENGTH_CHIPS: readonly LengthChip[] = [
  { id: 'short', label: '≤ 4', min: null, max: 4 },
  { id: 'medium', label: '5–6', min: 5, max: 6 },
  { id: 'long', label: '7–8', min: 7, max: 8 },
  { id: 'extraLong', label: '9+', min: 9, max: null },
];

type LengthRange = Pick<NameFilters, 'minLength' | 'maxLength'>;

/** The chip whose range is exactly the current one, if any. */
export function activeLengthChip(range: LengthRange): LengthChipId | null {
  const chip = LENGTH_CHIPS.find(
    (item) => item.min === range.minLength && item.max === range.maxLength,
  );
  return chip?.id ?? null;
}

/** Selects the chip's range, or clears the range when the chip is already active. */
export function toggleLengthChip(filters: NameFilters, id: LengthChipId): NameFilters {
  if (activeLengthChip(filters) === id) return { ...filters, minLength: null, maxLength: null };
  const chip = LENGTH_CHIPS.find((item) => item.id === id);
  if (!chip) return filters;
  return { ...filters, minLength: chip.min, maxLength: chip.max };
}

/** Human readable range, e.g. « 5–6 lettres », or null when no range is set. */
export function describeLength(range: LengthRange): string | null {
  const { minLength, maxLength } = range;
  if (minLength === null && maxLength === null) return null;
  if (minLength === null) return `≤ ${maxLength} lettres`;
  if (maxLength === null) return `${minLength} lettres et plus`;
  if (minLength === maxLength) return `${minLength} lettres`;
  return `${minLength}–${maxLength} lettres`;
}
