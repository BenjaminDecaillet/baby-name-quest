import { NameBadges } from '../../components/NameBadges';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import type { NameEntry } from '../../data/types';
import type { Couple, Profile, Vote } from '../../storage';
import { countLabel, partnerName, partnerNoteLabel } from './matchesLogic';
import { NoteText } from './NoteText';

interface TheirFavoritesTabProps {
  entries: NameEntry[];
  mine: Map<string, Vote>;
  theirs: Map<string, Vote>;
  partner: Profile | null;
  couple: Couple | null;
  onLike: (entry: NameEntry) => void;
}

export function TheirFavoritesTab({
  entries,
  mine,
  theirs,
  partner,
  couple,
  onLike,
}: TheirFavoritesTabProps) {
  if (!partner) {
    return (
      <EmptyState
        icon="💌"
        title="Votre moitié n'a pas encore rejoint"
        description="Partagez-lui votre code de couple : dès qu'un second profil est créé avec ce code, ses favoris apparaîtront ici."
        action={
          couple ? (
            <p className="rounded-xl bg-stone-100 px-4 py-2 font-mono text-lg font-bold text-rose-600">
              <span className="sr-only">Code de couple : </span>
              {couple.code}
            </p>
          ) : null
        }
      />
    );
  }

  const name = partnerName(partner) ?? 'votre moitié';

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="🤍"
        title={`${name} n'a pas encore de favori`}
        description={`Les prénoms que ${name} aime apparaîtront ici, avec ses notes.`}
      />
    );
  }

  const noteLabel = partnerNoteLabel(partner);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-stone-700">{countLabel(entries.length)}</p>
      <ul aria-label={`Favoris de ${name}`} className="flex flex-col gap-2">
        {entries.map((entry) => {
          const matched = mine.get(entry.id)?.value === 'like';
          return (
            <li key={entry.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-bold text-stone-800">{entry.name}</p>
                  <div className="mt-1.5">
                    <NameBadges entry={entry} compact />
                  </div>
                  <div className="mt-1.5">
                    <NoteText label={noteLabel} note={theirs.get(entry.id)?.note} />
                  </div>
                </div>
                {matched ? (
                  <Badge tone="rose" className="shrink-0">
                    <span aria-hidden="true">💞</span>Match
                  </Badge>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    aria-label={`J'aime aussi ${entry.name}`}
                    onClick={() => onLike(entry)}
                  >
                    <span aria-hidden="true">♥</span>
                    J'aime aussi
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
