import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  applyPreference,
  countActiveFilters,
  filterAndSort,
  listOrigins,
  normalizeForSearch,
} from './filters';
import type { NameEntry } from './types';

const make = (partial: Partial<NameEntry> & Pick<NameEntry, 'name'>): NameEntry => ({
  id: partial.name.toLowerCase(),
  gender: 'f',
  countFR: 100,
  countCH: 10,
  recentFR: 10,
  recentCH: 1,
  popularityRank: 1000,
  trend: 'stable',
  firstLetter: partial.name[0].toUpperCase(),
  length: partial.name.replace(/[^a-zà-ÿ]/gi, '').length,
  ...partial,
});

const names: NameEntry[] = [
  make({ name: 'Zoé', popularityRank: 5, trend: 'up', origin: 'grec' }),
  make({ name: 'Loïc', gender: 'm', popularityRank: 300, trend: 'down', origin: 'germanique' }),
  make({ name: 'Camille', gender: 'x', popularityRank: 40, origin: 'latin' }),
  make({ name: 'Anaïs', popularityRank: 2500, trend: 'down' }),
  make({ name: 'Jean-Pierre', gender: 'm', popularityRank: 4000, firstLetter: 'J' }),
];

describe('normalizeForSearch', () => {
  it('strips accents and case', () => {
    expect(normalizeForSearch('Zoé')).toBe('zoe');
    expect(normalizeForSearch('  Loïc ')).toBe('loic');
  });
});

describe('applyPreference', () => {
  it('keeps mixed names for a single-gender preference', () => {
    expect(applyPreference(names, 'f').map((n) => n.name)).toEqual(['Zoé', 'Camille', 'Anaïs']);
    expect(applyPreference(names, 'm').map((n) => n.name)).toEqual([
      'Loïc',
      'Camille',
      'Jean-Pierre',
    ]);
    expect(applyPreference(names, 'both')).toHaveLength(5);
  });
});

describe('filterAndSort', () => {
  it('sorts by popularity by default', () => {
    expect(filterAndSort(names, EMPTY_FILTERS).map((n) => n.name)).toEqual([
      'Zoé',
      'Camille',
      'Loïc',
      'Anaïs',
      'Jean-Pierre',
    ]);
  });

  it('matches accent-insensitive queries and ranks prefixes first', () => {
    const result = filterAndSort(names, { ...EMPTY_FILTERS, query: 'an' });
    expect(result.map((n) => n.name)).toEqual(['Anaïs', 'Jean-Pierre']);
  });

  it('filters by letter, length, popularity, trend and origin', () => {
    expect(filterAndSort(names, { ...EMPTY_FILTERS, letters: ['Z', 'L'] })).toHaveLength(2);
    expect(
      filterAndSort(names, { ...EMPTY_FILTERS, minLength: 5, maxLength: 7 }).map((n) => n.name),
    ).toEqual(['Camille', 'Anaïs']);
    expect(
      filterAndSort(names, { ...EMPTY_FILTERS, popularity: ['classic'] }).map((n) => n.name),
    ).toEqual(['Zoé', 'Camille']);
    expect(filterAndSort(names, { ...EMPTY_FILTERS, trends: ['down'] })).toHaveLength(2);
    expect(
      filterAndSort(names, { ...EMPTY_FILTERS, origins: ['latin'] }).map((n) => n.name),
    ).toEqual(['Camille']);
  });

  it('sorts alphabetically with french collation', () => {
    expect(filterAndSort(names, { ...EMPTY_FILTERS, sort: 'alpha' }).map((n) => n.name)).toEqual([
      'Anaïs',
      'Camille',
      'Jean-Pierre',
      'Loïc',
      'Zoé',
    ]);
  });
});

describe('helpers', () => {
  it('counts active filters', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, letters: ['A'], minLength: 3 })).toBe(2);
  });

  it('lists origins by frequency', () => {
    expect(listOrigins(names)).toEqual(['germanique', 'grec', 'latin']);
  });
});
