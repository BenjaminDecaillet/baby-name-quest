import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '../../data/filters';
import { LENGTH_CHIPS, activeLengthChip, describeLength, toggleLengthChip } from './lengthChips';
import { compatibleGenders, listActiveFilterChips } from './filterHelpers';

describe('length chips', () => {
  it('maps every chip to a disjoint min/max range', () => {
    expect(LENGTH_CHIPS.map((chip) => [chip.min, chip.max])).toEqual([
      [null, 4],
      [5, 6],
      [7, 8],
      [9, null],
    ]);
  });

  it('selects a chip and clears it when toggled again', () => {
    const selected = toggleLengthChip(EMPTY_FILTERS, 'medium');
    expect(selected).toMatchObject({ minLength: 5, maxLength: 6 });
    expect(activeLengthChip(selected)).toBe('medium');

    const switched = toggleLengthChip(selected, 'extraLong');
    expect(switched).toMatchObject({ minLength: 9, maxLength: null });

    expect(toggleLengthChip(switched, 'extraLong')).toMatchObject({
      minLength: null,
      maxLength: null,
    });
  });

  it('recognises no chip for a custom range', () => {
    expect(activeLengthChip({ minLength: 3, maxLength: 7 })).toBeNull();
    expect(activeLengthChip(EMPTY_FILTERS)).toBeNull();
  });

  it('describes ranges in French', () => {
    expect(describeLength(EMPTY_FILTERS)).toBeNull();
    expect(describeLength({ minLength: null, maxLength: 4 })).toBe('≤ 4 lettres');
    expect(describeLength({ minLength: 5, maxLength: 6 })).toBe('5–6 lettres');
    expect(describeLength({ minLength: 9, maxLength: null })).toBe('9 lettres et plus');
    expect(describeLength({ minLength: 5, maxLength: 5 })).toBe('5 lettres');
  });
});

describe('filter helpers', () => {
  it('only offers genders compatible with the preference', () => {
    expect(compatibleGenders('f')).toEqual(['f', 'x']);
    expect(compatibleGenders('m')).toEqual(['m', 'x']);
    expect(compatibleGenders('both')).toEqual(['f', 'm', 'x']);
  });

  it('lists one removable chip per active value', () => {
    const filters = {
      ...EMPTY_FILTERS,
      genders: ['f' as const],
      letters: ['A', 'B'],
      minLength: 7,
      maxLength: 8,
      popularity: ['rare' as const],
      trends: ['up' as const],
      origins: ['latin'],
      sort: 'alpha' as const,
    };
    const chips = listActiveFilterChips(filters);
    expect(chips.map((chip) => chip.label)).toEqual([
      'Fille',
      'Lettre A',
      'Lettre B',
      '7–8 lettres',
      'Rares',
      'En hausse',
      'Origine latin',
    ]);
    const withoutB = chips[2].remove(filters);
    expect(withoutB.letters).toEqual(['A']);
    expect(withoutB.sort).toBe('alpha');
    expect(chips[3].remove(filters)).toMatchObject({ minLength: null, maxLength: null });
  });
});
