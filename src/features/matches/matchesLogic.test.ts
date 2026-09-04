import { describe, expect, it } from 'vitest';
import type { NameEntry } from '../../data/types';
import {
  countLabel,
  moveItem,
  parseTab,
  partnerName,
  partnerNoteLabel,
  resolveEntries,
  sharedOrderCaption,
  theirTabLabel,
} from './matchesLogic';

const entry = (id: string, gender: NameEntry['gender']): NameEntry => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  gender,
  countFR: 100,
  countCH: 10,
  recentFR: 10,
  recentCH: 1,
  popularityRank: 50,
  trend: 'stable',
  firstLetter: id.charAt(0).toUpperCase(),
  length: id.length,
});

describe('moveItem', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves an item down and up', () => {
    expect(moveItem(ids, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(ids, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('never mutates the input', () => {
    const copy = [...ids];
    moveItem(ids, 0, 3);
    expect(ids).toEqual(copy);
  });

  it('returns an unchanged copy on no-op or out-of-range moves', () => {
    expect(moveItem(ids, 1, 1)).toEqual(ids);
    expect(moveItem(ids, -1, 2)).toEqual(ids);
    expect(moveItem(ids, 0, 4)).toEqual(ids);
    expect(moveItem(ids, 0, 1.5)).toEqual(ids);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});

describe('resolveEntries', () => {
  const byId = new Map([
    ['zoe', entry('zoe', 'f')],
    ['luca', entry('luca', 'm')],
    ['noa', entry('noa', 'x')],
  ]);

  it('keeps the incoming order and skips unknown ids', () => {
    expect(resolveEntries(['luca', 'ghost', 'zoe'], byId).map((item) => item.id)).toEqual([
      'luca',
      'zoe',
    ]);
  });

  it('applies the gender preference, mixed names always pass', () => {
    expect(resolveEntries(['zoe', 'luca', 'noa'], byId, 'f').map((item) => item.id)).toEqual([
      'zoe',
      'noa',
    ]);
    expect(resolveEntries(['zoe', 'luca', 'noa'], byId, 'm').map((item) => item.id)).toEqual([
      'luca',
      'noa',
    ]);
  });
});

describe('parseTab', () => {
  it('accepts the known tabs and falls back to « matchs »', () => {
    expect(parseTab('moi')).toBe('moi');
    expect(parseTab('elle')).toBe('elle');
    expect(parseTab('matchs')).toBe('matchs');
    expect(parseTab('autre')).toBe('matchs');
    expect(parseTab(null)).toBe('matchs');
    expect(parseTab(undefined)).toBe('matchs');
  });
});

describe('partner labels', () => {
  it('uses the partner name when known', () => {
    const partner = { displayName: '  Marie ' };
    expect(partnerName(partner)).toBe('Marie');
    expect(theirTabLabel(partner)).toBe('Favoris de Marie');
    expect(sharedOrderCaption(partner)).toBe('Ordre partagé avec Marie');
    expect(partnerNoteLabel(partner)).toBe('Note de Marie');
  });

  it('falls back to neutral wording otherwise', () => {
    expect(partnerName(null)).toBeNull();
    expect(partnerName({ displayName: '   ' })).toBeNull();
    expect(theirTabLabel(null)).toBe('Ses favoris');
    expect(sharedOrderCaption(undefined)).toBe('Ordre partagé avec votre moitié');
    expect(partnerNoteLabel(null)).toBe('Sa note');
  });
});

describe('countLabel', () => {
  it('handles zero, one and many', () => {
    expect(countLabel(0)).toBe('Aucun prénom');
    expect(countLabel(1)).toBe('1 prénom');
    expect(countLabel(12)).toBe('12 prénoms');
    expect(countLabel(2, 'match', 'matchs')).toBe('2 matchs');
  });
});
