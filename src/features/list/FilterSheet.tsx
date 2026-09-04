import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import {
  EMPTY_FILTERS,
  LETTERS,
  SORT_LABELS,
  countActiveFilters,
  type NameFilters,
  type SortKey,
} from '../../data/filters';
import { POPULARITY_BUCKETS, formatCount } from '../../data/popularity';
import { GENDER_LABELS, TREND_LABELS, type GenderPreference, type Trend } from '../../data/types';
import { compatibleGenders, toggleItem } from './filterHelpers';
import { LENGTH_CHIPS, activeLengthChip, toggleLengthChip } from './lengthChips';

const TRENDS: readonly Trend[] = ['up', 'stable', 'down'];
const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];
const ORIGINS_PREVIEW = 12;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FilterSheetProps {
  open: boolean;
  filters: NameFilters;
  preference: GenderPreference;
  origins: string[];
  resultCount: number;
  onChange(next: NameFilters): void;
  onClose(): void;
}

export function FilterSheet({
  open,
  filters,
  preference,
  origins,
  resultCount,
  onChange,
  onClose,
}: FilterSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [showAllOrigins, setShowAllOrigins] = useState(false);

  // Move focus inside, lock the page scroll and listen for Escape while open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Keep Tab inside the dialog.
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const genders = compatibleGenders(preference);
  const activeLength = activeLengthChip(filters);
  const selectedOrigins = new Set(filters.origins);
  const previewOrigins = origins.slice(0, ORIGINS_PREVIEW);
  const visibleOrigins = showAllOrigins
    ? origins
    : [...previewOrigins, ...origins.slice(ORIGINS_PREVIEW).filter((o) => selectedOrigins.has(o))];
  const hiddenOriginCount = origins.length - previewOrigins.length;
  const activeCount = countActiveFilters(filters);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-stone-900/40"
        aria-hidden="true"
        onClick={onClose}
        data-testid="filter-backdrop"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-3xl bg-stone-50 shadow-xl outline-none sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <h2 id={titleId} className="text-lg font-bold text-stone-800">
            Filtres
            {activeCount > 0 ? (
              <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">
                {activeCount}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-stone-500 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            aria-label="Fermer les filtres"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          <Section title="Genre">
            {genders.map((gender) => (
              <Chip
                key={gender}
                selected={filters.genders.includes(gender)}
                onClick={() =>
                  onChange({ ...filters, genders: toggleItem(filters.genders, gender) })
                }
              >
                {GENDER_LABELS[gender]}
              </Chip>
            ))}
          </Section>

          <Section title="Première lettre" grid>
            {LETTERS.map((letter) => (
              <Chip
                key={letter}
                selected={filters.letters.includes(letter)}
                className="min-h-11 px-0"
                aria-label={`Lettre ${letter}`}
                onClick={() =>
                  onChange({ ...filters, letters: toggleItem(filters.letters, letter) })
                }
              >
                {letter}
              </Chip>
            ))}
          </Section>

          <Section title="Longueur" hint="Nombre de lettres">
            {LENGTH_CHIPS.map((chip) => (
              <Chip
                key={chip.id}
                selected={activeLength === chip.id}
                onClick={() => onChange(toggleLengthChip(filters, chip.id))}
              >
                {chip.label}
              </Chip>
            ))}
          </Section>

          <Section title="Popularité">
            {POPULARITY_BUCKETS.map((bucket) => (
              <Chip
                key={bucket.id}
                selected={filters.popularity.includes(bucket.id)}
                onClick={() =>
                  onChange({ ...filters, popularity: toggleItem(filters.popularity, bucket.id) })
                }
              >
                {bucket.label}
                <span className="ml-1 text-xs opacity-75">({bucket.hint})</span>
              </Chip>
            ))}
          </Section>

          <Section title="Tendance">
            {TRENDS.map((trend) => (
              <Chip
                key={trend}
                selected={filters.trends.includes(trend)}
                onClick={() => onChange({ ...filters, trends: toggleItem(filters.trends, trend) })}
              >
                {TREND_LABELS[trend]}
              </Chip>
            ))}
          </Section>

          {origins.length > 0 ? (
            <Section title="Origine">
              {visibleOrigins.map((origin) => (
                <Chip
                  key={origin}
                  selected={selectedOrigins.has(origin)}
                  className="capitalize"
                  onClick={() =>
                    onChange({ ...filters, origins: toggleItem(filters.origins, origin) })
                  }
                >
                  {origin}
                </Chip>
              ))}
              {hiddenOriginCount > 0 ? (
                <Button
                  variant="ghost"
                  className="min-h-10 rounded-full px-3.5 text-sm"
                  aria-expanded={showAllOrigins}
                  onClick={() => setShowAllOrigins((value) => !value)}
                >
                  {showAllOrigins ? 'Moins' : `Plus (${hiddenOriginCount})`}
                </Button>
              ) : null}
            </Section>
          ) : null}

          <Section title="Tri">
            {SORT_KEYS.map((key) => (
              <Chip
                key={key}
                selected={filters.sort === key}
                onClick={() => onChange({ ...filters, sort: key })}
              >
                {SORT_LABELS[key]}
              </Chip>
            ))}
          </Section>
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-stone-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            variant="secondary"
            disabled={activeCount === 0}
            onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query, sort: filters.sort })}
          >
            Tout effacer
          </Button>
          <Button onClick={onClose}>
            Voir {formatCount(resultCount)} prénom{resultCount > 1 ? 's' : ''}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  grid = false,
  children,
}: {
  title: string;
  hint?: string;
  grid?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold text-stone-700">
        {title}
        {hint ? <span className="ml-2 text-xs font-normal text-stone-500">{hint}</span> : null}
      </h3>
      <div
        role="group"
        aria-labelledby={id}
        className={
          grid ? 'mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-9' : 'mt-2 flex flex-wrap gap-2'
        }
      >
        {children}
      </div>
    </section>
  );
}
