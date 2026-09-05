/** One row of a source file: a name, a sex, a birth year and the number of births. */
export interface NameRecord {
  name: string;
  sex: 'f' | 'm';
  year: number;
  count: number;
}

/**
 * Description of a source, written to names.meta.json.
 * The fields name / url / licence / years are the ones read by the app (src/data/types.ts).
 */
export interface SourceMeta {
  id: string;
  name: string;
  url: string;
  licence: string;
  years: string;
  downloadUrls: string[];
  encoding: string;
  firstYear: number;
  lastYear: number;
  rows: number;
  notes?: string;
}

export type Gender = 'f' | 'm' | 'x';
export type Trend = 'up' | 'stable' | 'down';

/** One entry of public/data/names.json. */
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
