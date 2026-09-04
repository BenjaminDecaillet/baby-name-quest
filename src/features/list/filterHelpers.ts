import type { NameFilters } from '../../data/filters';
import { POPULARITY_BUCKETS } from '../../data/popularity';
import { GENDER_LABELS, TREND_LABELS, type Gender, type GenderPreference } from '../../data/types';
import { describeLength } from './lengthChips';

/** Genders the user may filter on, given the couple's preference. */
export function compatibleGenders(preference: GenderPreference): Gender[] {
  if (preference === 'f') return ['f', 'x'];
  if (preference === 'm') return ['m', 'x'];
  return ['f', 'm', 'x'];
}

export function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  remove(filters: NameFilters): NameFilters;
}

/** One removable chip per active filter value (sort and search excluded). */
export function listActiveFilterChips(filters: NameFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const gender of filters.genders) {
    chips.push({
      key: `gender:${gender}`,
      label: GENDER_LABELS[gender],
      remove: (current) => ({
        ...current,
        genders: current.genders.filter((item) => item !== gender),
      }),
    });
  }
  for (const letter of filters.letters) {
    chips.push({
      key: `letter:${letter}`,
      label: `Lettre ${letter}`,
      remove: (current) => ({
        ...current,
        letters: current.letters.filter((item) => item !== letter),
      }),
    });
  }
  const length = describeLength(filters);
  if (length) {
    chips.push({
      key: 'length',
      label: length,
      remove: (current) => ({ ...current, minLength: null, maxLength: null }),
    });
  }
  for (const bucket of filters.popularity) {
    chips.push({
      key: `popularity:${bucket}`,
      label: POPULARITY_BUCKETS.find((item) => item.id === bucket)?.label ?? bucket,
      remove: (current) => ({
        ...current,
        popularity: current.popularity.filter((item) => item !== bucket),
      }),
    });
  }
  for (const trend of filters.trends) {
    chips.push({
      key: `trend:${trend}`,
      label: TREND_LABELS[trend],
      remove: (current) => ({
        ...current,
        trends: current.trends.filter((item) => item !== trend),
      }),
    });
  }
  for (const origin of filters.origins) {
    chips.push({
      key: `origin:${origin}`,
      label: `Origine ${origin}`,
      remove: (current) => ({
        ...current,
        origins: current.origins.filter((item) => item !== origin),
      }),
    });
  }
  return chips;
}
