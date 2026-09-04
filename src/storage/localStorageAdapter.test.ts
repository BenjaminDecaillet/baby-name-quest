import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from './localStorageAdapter';
import { isValidCoupleCode, normalizeCoupleCode, type Profile, type Vote } from './types';

const profile = (id: string, displayName: string): Profile => ({
  id,
  coupleCode: 'DECAILLET-2026',
  displayName,
  genderPreference: 'both',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const vote = (profileId: string, nameId: string, value: Vote['value'] = 'like'): Vote => ({
  profileId,
  nameId,
  value,
  note: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('creates a couple once and stores profiles', async () => {
    const couple = await adapter.ensureCouple('DECAILLET-2026');
    expect(couple.code).toBe('DECAILLET-2026');
    await adapter.upsertProfile(profile('p1', 'Benjamin'));
    await adapter.upsertProfile(profile('p2', 'Marie'));
    await adapter.upsertProfile({ ...profile('p1', 'Ben'), genderPreference: 'f' });
    const profiles = await adapter.listProfiles('DECAILLET-2026');
    expect(profiles.map((p) => p.displayName)).toEqual(['Ben', 'Marie']);
    expect(profiles[0].genderPreference).toBe('f');
  });

  it('upserts, lists and deletes votes', async () => {
    await adapter.ensureCouple('DECAILLET-2026');
    await adapter.saveVote('DECAILLET-2026', vote('p1', 'zoe-f'));
    await adapter.saveVote('DECAILLET-2026', vote('p1', 'zoe-f', 'skip'));
    await adapter.saveVote('DECAILLET-2026', vote('p2', 'zoe-f'));
    expect(await adapter.listVotes('DECAILLET-2026')).toHaveLength(2);
    expect((await adapter.listVotes('DECAILLET-2026'))[0].value).toBe('skip');
    await adapter.deleteVote('DECAILLET-2026', 'p1', 'zoe-f');
    expect(await adapter.listVotes('DECAILLET-2026')).toHaveLength(1);
  });

  it('persists the match order', async () => {
    await adapter.ensureCouple('DECAILLET-2026');
    await adapter.saveMatchOrder('DECAILLET-2026', ['a', 'b']);
    expect((await adapter.ensureCouple('DECAILLET-2026')).matchOrder).toEqual(['a', 'b']);
  });
});

describe('couple codes', () => {
  it('normalizes user input', () => {
    expect(normalizeCoupleCode('  décaillet 2026 ')).toBe('DECAILLET-2026');
    expect(normalizeCoupleCode('a--b')).toBe('A-B');
  });

  it('validates the normalized form', () => {
    expect(isValidCoupleCode('DECAILLET-2026')).toBe(true);
    expect(isValidCoupleCode('AB')).toBe(false);
    expect(isValidCoupleCode('-ABC')).toBe(false);
  });
});
