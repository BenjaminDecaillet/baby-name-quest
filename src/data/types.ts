export type Gender = 'f' | 'm' | 'x';
export type Trend = 'up' | 'stable' | 'down';

/** One first name as produced by `scripts/build-names.ts` in `public/data/names.json`. */
export interface NameEntry {
  id: string;
  name: string;
  gender: Gender;
  countFR: number;
  countCH: number;
  recentFR: number;
  recentCH: number;
  popularityRank: number;
  trend: Trend;
  firstLetter: string;
  length: number;
  origin?: string;
  /** Short French meaning of the name (curated), e.g. « force de Dieu ». */
  meaning?: string;
}

export interface NamesMeta {
  generatedAt: string;
  total: number;
  sources: Array<{ name: string; url: string; licence?: string; years?: string }>;
}

/** Gender the couple is looking for; `both` keeps every name. */
export type GenderPreference = 'f' | 'm' | 'both';

export const GENDER_LABELS: Record<Gender, string> = {
  f: 'Fille',
  m: 'Garçon',
  x: 'Mixte',
};

export const TREND_LABELS: Record<Trend, string> = {
  up: 'En hausse',
  stable: 'Stable',
  down: 'En baisse',
};

export const GENDER_PREFERENCE_LABELS: Record<GenderPreference, string> = {
  f: 'Une fille',
  m: 'Un garçon',
  both: 'Les deux',
};
