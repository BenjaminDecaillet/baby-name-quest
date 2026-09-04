import { useMemo } from 'react';
import type { Vote } from '../storage';
import { useSession } from './SessionContext';

export interface VoteSummary {
  /** My votes, keyed by name id. */
  mine: Map<string, Vote>;
  /** My partner's votes, keyed by name id. */
  theirs: Map<string, Vote>;
  myLikes: string[];
  theirLikes: string[];
  /** Names liked by both of us, ordered by the couple's saved order then by date. */
  matches: string[];
}

export function summarizeVotes(
  votes: Vote[],
  profileId: string | null,
  partnerId: string | null,
  order: string[],
): VoteSummary {
  const mine = new Map<string, Vote>();
  const theirs = new Map<string, Vote>();
  for (const vote of votes) {
    if (vote.profileId === profileId) mine.set(vote.nameId, vote);
    else if (vote.profileId === partnerId) theirs.set(vote.nameId, vote);
  }
  const byDate = (map: Map<string, Vote>) =>
    [...map.values()]
      .filter((vote) => vote.value === 'like')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.nameId.localeCompare(b.nameId))
      .map((vote) => vote.nameId);
  const myLikes = byDate(mine);
  const theirLikeSet = new Set(byDate(theirs));
  const matchSet = new Set(myLikes.filter((id) => theirLikeSet.has(id)));
  const ordered = order.filter((id) => matchSet.has(id));
  const orderedSet = new Set(ordered);
  const matches = [...ordered, ...myLikes.filter((id) => matchSet.has(id) && !orderedSet.has(id))];
  return { mine, theirs, myLikes, theirLikes: [...theirLikeSet], matches };
}

export function useVotes(): VoteSummary {
  const { votes, profile, partner, couple } = useSession();
  return useMemo(
    () => summarizeVotes(votes, profile?.id ?? null, partner?.id ?? null, couple?.matchOrder ?? []),
    [votes, profile, partner, couple],
  );
}
