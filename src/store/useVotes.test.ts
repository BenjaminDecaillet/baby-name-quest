import { describe, expect, it } from 'vitest';
import type { Vote } from '../storage';
import { summarizeVotes } from './useVotes';

const vote = (
  profileId: string,
  nameId: string,
  value: Vote['value'],
  updatedAt: string,
): Vote => ({
  profileId,
  nameId,
  value,
  note: null,
  updatedAt,
});

describe('summarizeVotes', () => {
  const votes = [
    vote('me', 'zoe', 'like', '2026-01-03'),
    vote('me', 'lea', 'like', '2026-01-01'),
    vote('me', 'noe', 'skip', '2026-01-02'),
    vote('me', 'luca', 'like', '2026-01-04'),
    vote('you', 'zoe', 'like', '2026-01-05'),
    vote('you', 'lea', 'skip', '2026-01-05'),
    vote('you', 'luca', 'like', '2026-01-06'),
    vote('you', 'emma', 'like', '2026-01-07'),
    vote('stranger', 'zoe', 'like', '2026-01-06'),
  ];

  it('splits votes between me and my partner and ignores strangers', () => {
    const summary = summarizeVotes(votes, 'me', 'you', []);
    expect(summary.mine.size).toBe(4);
    expect(summary.theirs.size).toBe(4);
    expect(summary.myLikes).toEqual(['luca', 'zoe', 'lea']);
    expect(summary.theirLikes).toEqual(['emma', 'luca', 'zoe']);
  });

  it('computes matches, honouring the saved order first', () => {
    expect(summarizeVotes(votes, 'me', 'you', []).matches).toEqual(['luca', 'zoe']);
    expect(summarizeVotes(votes, 'me', 'you', ['zoe', 'ghost']).matches).toEqual(['zoe', 'luca']);
  });

  it('has no matches without a partner', () => {
    expect(summarizeVotes(votes, 'me', null, []).matches).toEqual([]);
  });
});
