import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { NameBadges } from '../../components/NameBadges';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import type { NameEntry } from '../../data/types';
import type { Vote } from '../../storage';
import { countLabel } from './matchesLogic';

interface MyFavoritesTabProps {
  entries: NameEntry[];
  mine: Map<string, Vote>;
  theirs: Map<string, Vote>;
  onSaveNote: (id: string, note: string | null) => void;
  onRemove: (entry: NameEntry) => void;
}

export function MyFavoritesTab({
  entries,
  mine,
  theirs,
  onSaveNote,
  onRemove,
}: MyFavoritesTabProps) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="💝"
        title="Vous n'avez pas encore de favori"
        description="Aimez des prénoms en les découvrant : ils apparaîtront ici, avec vos notes."
        action={<Button onClick={() => navigate('/swipe')}>Découvrir des prénoms</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-stone-700">{countLabel(entries.length)}</p>
      <ul aria-label="Mes favoris" className="flex flex-col gap-2">
        {entries.map((entry) => {
          const matched = theirs.get(entry.id)?.value === 'like';
          return (
            <li key={entry.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg leading-tight font-bold text-stone-800">
                    <span>{entry.name}</span>
                    {matched ? (
                      <Badge tone="rose">
                        <span aria-hidden="true">💞</span>Match
                      </Badge>
                    ) : null}
                  </p>
                  <div className="mt-1.5">
                    <NameBadges entry={entry} compact />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0 px-3 text-xs text-stone-500"
                  onClick={() => onRemove(entry)}
                >
                  Retirer
                </Button>
              </div>
              <NoteEditor
                entry={entry}
                note={mine.get(entry.id)?.note ?? null}
                onSave={(note) => onSaveNote(entry.id, note)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const NOTE_MAX_LENGTH = 280;

function NoteEditor({
  entry,
  note,
  onSave,
}: {
  entry: NameEntry;
  note: string | null;
  onSave: (note: string | null) => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const open = () => {
    setDraft(note ?? '');
    setEditing(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    onSave(trimmed ? trimmed : null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="mt-2 flex items-end justify-between gap-2">
        {note ? (
          <p className="min-w-0 flex-1 text-sm text-stone-600">
            <span className="font-semibold text-stone-500">Ma note :</span>{' '}
            <span className="italic">« {note} »</span>
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          className="min-h-10 shrink-0 px-3 text-xs"
          aria-label={`${note ? 'Modifier la note' : 'Ajouter une note'} sur ${entry.name}`}
          onClick={open}
        >
          {note ? 'Modifier la note' : 'Ajouter une note'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-stone-500">
        Note sur {entry.name}
      </label>
      <textarea
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={2}
        maxLength={NOTE_MAX_LENGTH}
        autoFocus
        placeholder="Ce que ce prénom vous évoque, un doute, une idée de second prénom…"
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:border-rose-400 focus:bg-white focus:outline-2 focus:outline-rose-500"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Annuler
        </Button>
        <Button type="submit" variant="secondary">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
