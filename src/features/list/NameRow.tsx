import { memo } from 'react';
import { NameBadges, NameMeaning, NameStats } from '../../components/NameBadges';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { NameEntry } from '../../data/types';
import type { VoteValue } from '../../storage';

export interface NameRowProps {
  entry: NameEntry;
  myVote: VoteValue | null;
  partnerLiked: boolean;
  partnerName: string | null;
  expanded: boolean;
  onToggle(id: string): void;
  onLike(id: string): void;
  onUnlike(id: string): void;
  onSkip(id: string): void;
}

function NameRowComponent({
  entry,
  myVote,
  partnerLiked,
  partnerName,
  expanded,
  onToggle,
  onLike,
  onUnlike,
  onSkip,
}: NameRowProps) {
  const liked = myVote === 'like';
  const skipped = myVote === 'skip';
  const match = liked && partnerLiked;
  const detailsId = `name-details-${entry.id}`;

  return (
    <li
      className={`rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition ${
        skipped ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-2 py-2 pr-2 pl-4">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(entry.id)}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={`text-lg font-semibold ${skipped ? 'text-stone-500' : 'text-stone-800'}`}
            >
              {entry.name}
            </span>
            {match ? <Badge tone="rose">Match</Badge> : null}
            {skipped ? (
              <span className="text-xs font-medium text-stone-400 italic">passé</span>
            ) : null}
            {!match && partnerLiked ? (
              <span className="text-xs font-medium text-rose-700">
                <span aria-hidden="true">💞 </span>
                Aimé par {partnerName ?? 'votre moitié'}
              </span>
            ) : null}
          </span>
          <NameBadges entry={entry} compact />
        </button>
        <button
          type="button"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
            skipped ? 'text-red-600 hover:bg-red-50' : 'text-stone-300 hover:bg-stone-100'
          }`}
          aria-pressed={skipped}
          aria-label={skipped ? `Reprendre ${entry.name}` : `Passer ${entry.name}`}
          onClick={() => (skipped ? onUnlike(entry.id) : onSkip(entry.id))}
        >
          <span aria-hidden="true">✕</span>
        </button>
        <button
          type="button"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
            liked ? 'text-rose-600 hover:bg-rose-50' : 'text-stone-300 hover:bg-stone-100'
          }`}
          aria-pressed={liked}
          aria-label={liked ? `Retirer ${entry.name} de mes favoris` : `Aimer ${entry.name}`}
          onClick={() => (liked ? onUnlike(entry.id) : onLike(entry.id))}
        >
          <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
        </button>
      </div>
      {expanded ? (
        <div id={detailsId} className="border-t border-stone-100 px-4 pt-3 pb-4">
          <NameMeaning entry={entry} className="mb-3 text-sm" />
          <NameStats entry={entry} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant={liked ? 'primary' : 'secondary'}
              aria-pressed={liked}
              onClick={() => (liked ? onUnlike(entry.id) : onLike(entry.id))}
            >
              <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
              J'aime
            </Button>
            <Button
              variant="secondary"
              aria-pressed={skipped}
              className={skipped ? 'bg-stone-100' : ''}
              onClick={() => (skipped ? onUnlike(entry.id) : onSkip(entry.id))}
            >
              <span aria-hidden="true">✕</span>
              Je passe
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Memoised: the list renders dozens of rows and re-renders on every vote. */
export const NameRow = memo(NameRowComponent);
