import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenderBadge } from '../../components/NameBadges';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import type { NameEntry } from '../../data/types';
import type { Profile, Vote } from '../../storage';
import {
  MEDALS,
  PODIUM_LABELS,
  PODIUM_SIZE,
  countLabel,
  moveItem,
  partnerNoteLabel,
  sharedOrderCaption,
} from './matchesLogic';
import { NoteText } from './NoteText';
import { useDragReorder } from './useDragReorder';

interface MatchesTabProps {
  entries: NameEntry[];
  mine: Map<string, Vote>;
  theirs: Map<string, Vote>;
  partner: Profile | null;
  onReorder: (ids: string[]) => void;
  onRemove: (entry: NameEntry) => void;
}

export function MatchesTab({
  entries,
  mine,
  theirs,
  partner,
  onReorder,
  onRemove,
}: MatchesTabProps) {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterMove = useRef<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= entries.length || from === to) return;
    const ids = entries.map((entry) => entry.id);
    const moved = entries[from];
    onReorder(moveItem(ids, from, to));
    setAnnouncement(`${moved.name} est maintenant en position ${to + 1} sur ${entries.length}.`);
  };

  const { dragging, getRowProps, getHandleProps } = useDragReorder(move);

  // Keep the keyboard focus on the handle that was just moved.
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    handles.current.get(id)?.focus();
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="💞"
        title="Pas encore de match"
        description="Continuez à découvrir des prénoms : dès que vous aimez tous les deux le même, il apparaît ici."
        action={<Button onClick={() => navigate('/swipe')}>Découvrir des prénoms</Button>}
      />
    );
  }

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const target = event.key === 'ArrowUp' ? index - 1 : index + 1;
    if (target < 0 || target >= entries.length) return;
    focusAfterMove.current = entries[index].id;
    move(index, target);
  };

  const theirLabel = partnerNoteLabel(partner);

  return (
    <div className="flex flex-col gap-5">
      <Podium entries={entries.slice(0, PODIUM_SIZE)} />

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-700">
          Classement complet · {countLabel(entries.length)}
        </h2>
        <p className="text-xs text-stone-500">{sharedOrderCaption(partner)}</p>
      </div>
      <p id="reorder-hint" className="sr-only">
        Utilisez les flèches haut et bas pour déplacer un prénom dans le classement.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ol
        aria-label="Classement complet"
        className={`flex flex-col gap-2 ${dragging ? 'select-none' : ''}`}
      >
        {entries.map((entry, index) => {
          const rowProps = getRowProps(index);
          const handleProps = getHandleProps(index);
          const isDragging = rowProps['data-dragging'] === 'true';
          return (
            <li
              key={entry.id}
              ref={rowProps.ref}
              style={rowProps.style}
              data-dragging={rowProps['data-dragging']}
              className={`relative rounded-2xl bg-white p-3 ring-1 ring-stone-200 ${
                isDragging ? 'z-10 shadow-lg ring-rose-300' : 'shadow-sm transition-transform'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-700"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-bold text-stone-800">
                    <span className="sr-only">Position {index + 1} : </span>
                    {entry.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                    <GenderBadge gender={entry.gender} />
                    {entry.origin ? <span>Origine {entry.origin}</span> : null}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    <NoteText label="Ma note" note={mine.get(entry.id)?.note} />
                    <NoteText label={theirLabel} note={theirs.get(entry.id)?.note} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={`Monter ${entry.name}`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label={`Descendre ${entry.name}`}
                    disabled={index === entries.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </IconButton>
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) handles.current.set(entry.id, element);
                      else handles.current.delete(entry.id);
                    }}
                    aria-label={`Déplacer ${entry.name}`}
                    aria-describedby="reorder-hint"
                    onKeyDown={(event) => onHandleKeyDown(event, index)}
                    className="flex h-11 w-9 cursor-grab items-center justify-center rounded-xl text-lg text-stone-400 select-none hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:cursor-grabbing"
                    {...handleProps}
                  >
                    <span aria-hidden="true">⋮⋮</span>
                  </button>
                </div>
              </div>
              <div className="mt-1 flex justify-end">
                <Button
                  variant="ghost"
                  className="min-h-10 px-3 text-xs text-stone-500"
                  onClick={() => onRemove(entry)}
                >
                  Retirer de mes favoris
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Podium({ entries }: { entries: NameEntry[] }) {
  const ORDER = ['order-2', 'order-1', 'order-3'];
  const LIFT = ['pb-4', 'pb-1', 'pb-0'];
  return (
    <ol aria-label="Podium" className="flex items-end justify-center gap-2">
      {entries.map((entry, index) => (
        <li key={entry.id} className={`min-w-0 flex-1 ${ORDER[index]} ${LIFT[index]}`}>
          <div
            className={`flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-center ring-1 ${
              index === 0 ? 'ring-rose-300 shadow-md' : 'ring-stone-200 shadow-sm'
            }`}
          >
            <span className={index === 0 ? 'text-4xl' : 'text-3xl'} aria-hidden="true">
              {MEDALS[index]}
            </span>
            <span className="sr-only">{PODIUM_LABELS[index]} : </span>
            <p className="w-full truncate text-lg font-extrabold text-stone-800">{entry.name}</p>
            <GenderBadge gender={entry.gender} />
            {entry.origin ? (
              <p className="w-full truncate text-xs text-stone-500">Origine {entry.origin}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-9 items-center justify-center rounded-xl text-lg text-stone-600 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
