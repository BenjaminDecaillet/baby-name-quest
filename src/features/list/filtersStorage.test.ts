import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '../../data/filters';
import {
  FILTERS_STORAGE_KEY,
  readStoredFilters,
  sanitizeFilters,
  writeStoredFilters,
} from './filtersStorage';

describe('sanitizeFilters', () => {
  it('returns the empty filters for garbage input', () => {
    expect(sanitizeFilters(null)).toEqual(EMPTY_FILTERS);
    expect(sanitizeFilters('nope')).toEqual(EMPTY_FILTERS);
    expect(sanitizeFilters([1, 2])).toEqual(EMPTY_FILTERS);
    expect(sanitizeFilters({})).toEqual(EMPTY_FILTERS);
  });

  it('keeps valid values and drops unknown ones', () => {
    const result = sanitizeFilters({
      query: 'lé',
      genders: ['f', 'zz', 'x', 'f', 3],
      letters: ['A', 'é', 'Z', 'AB'],
      minLength: 3,
      maxLength: '7',
      popularity: ['classic', 'unknown'],
      trends: ['up', 'sideways'],
      origins: ['latin', 42],
      sort: 'alpha',
      extra: true,
    });
    expect(result).toEqual({
      query: 'lé',
      genders: ['f', 'x'],
      letters: ['A', 'Z'],
      minLength: 3,
      maxLength: null,
      popularity: ['classic'],
      trends: ['up'],
      origins: ['latin'],
      sort: 'alpha',
    });
  });

  it('rejects impossible lengths and swaps an inverted range', () => {
    expect(sanitizeFilters({ minLength: 0, maxLength: 99 })).toMatchObject({
      minLength: null,
      maxLength: null,
    });
    expect(sanitizeFilters({ minLength: 8, maxLength: 5 })).toMatchObject({
      minLength: 5,
      maxLength: 8,
    });
    expect(sanitizeFilters({ sort: 'random' }).sort).toBe('popularity');
  });
});

describe('readStoredFilters / writeStoredFilters', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips through localStorage', () => {
    writeStoredFilters({ ...EMPTY_FILTERS, letters: ['M'], sort: 'length' });
    expect(window.localStorage.getItem(FILTERS_STORAGE_KEY)).not.toBeNull();
    expect(readStoredFilters()).toEqual({ ...EMPTY_FILTERS, letters: ['M'], sort: 'length' });
  });

  it('falls back to the empty filters on corrupt or missing data', () => {
    expect(readStoredFilters()).toEqual(EMPTY_FILTERS);
    window.localStorage.setItem(FILTERS_STORAGE_KEY, '{not json');
    expect(readStoredFilters()).toEqual(EMPTY_FILTERS);
    expect(readStoredFilters(null)).toEqual(EMPTY_FILTERS);
  });

  it('never throws when the storage is unusable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => writeStoredFilters(EMPTY_FILTERS, broken)).not.toThrow();
    expect(readStoredFilters(broken)).toEqual(EMPTY_FILTERS);
  });
});
