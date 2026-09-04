import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  applyPreference,
  countActiveFilters,
  filterAndSort,
  listOrigins,
  type NameFilters,
} from '../../data/filters';
import { formatCount } from '../../data/popularity';
import type { NameEntry } from '../../data/types';
import { useNames } from '../../data/useNames';
import { useSession } from '../../store/SessionContext';
import { useVotes } from '../../store/useVotes';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterSheet } from './FilterSheet';
import { compatibleGenders } from './filterHelpers';
import { NameRow } from './NameRow';
import { readStoredFilters, writeStoredFilters } from './filtersStorage';
import { useDebouncedValue } from './useDebouncedValue';

/** Rows rendered per « page »; more are appended on scroll or on demand. */
export const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 120;

export function ListPage() {
  const { names, loading, error } = useNames();
  const { profile, partner, vote, removeVote } = useSession();
  const { mine, theirs } = useVotes();
  const preference = profile?.genderPreference ?? 'both';

  const [filters, setFilters] = useState<NameFilters>(() => readStoredFilters());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // The shared Button does not forward refs: focus is restored through its wrapper.
  const filtersButtonRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeStoredFilters(filters);
  }, [filters]);

  // Typing filters instantly but the heavy work waits for a short pause.
  const debouncedQuery = useDebouncedValue(filters.query, SEARCH_DEBOUNCE_MS);

  const entries = useMemo(() => applyPreference(names, preference), [names, preference]);
  const origins = useMemo(() => listOrigins(entries), [entries]);

  // A gender that the preference already excludes must not be able to empty the list.
  const effectiveFilters = useMemo<NameFilters>(() => {
    const allowed = compatibleGenders(preference);
    return {
      ...filters,
      query: debouncedQuery,
      genders: filters.genders.filter((gender) => allowed.includes(gender)),
    };
  }, [filters, debouncedQuery, preference]);

  const filtered = useMemo(
    () => filterAndSort(entries, effectiveFilters),
    [entries, effectiveFilters],
  );

  // Start again from the first page whenever the result set changes.
  const [pagedFor, setPagedFor] = useState<NameEntry[]>(filtered);
  if (pagedFor !== filtered) {
    setPagedFor(filtered);
    setPage(1);
  }
  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;

  // Load the next page automatically when the sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasMore || !sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page]);

  // Rows are memoised: keep their callbacks stable even though `vote` changes with every vote.
  const actionsRef = useRef({ vote, removeVote });
  useEffect(() => {
    actionsRef.current = { vote, removeVote };
  }, [vote, removeVote]);
  const handleLike = useCallback((id: string) => {
    void actionsRef.current.vote(id, 'like');
  }, []);
  const handleSkip = useCallback((id: string) => {
    void actionsRef.current.vote(id, 'skip');
  }, []);
  const handleUnlike = useCallback((id: string) => {
    void actionsRef.current.removeVote(id);
  }, []);
  const handleToggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    filtersButtonRef.current?.querySelector('button')?.focus();
  }, []);

  const clearAll = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  const activeCount = countActiveFilters(effectiveFilters);
  const partnerName = partner?.displayName ?? null;

  return (
    <section className="flex flex-col">
      <h1 className="sr-only">Liste des prénoms</h1>
      <div
        className={`sticky top-0 z-10 flex flex-col gap-2 border-b border-stone-200 bg-stone-50/95 px-4 pt-3 pb-2 backdrop-blur`}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="list-search" className="sr-only">
              Rechercher un prénom
            </label>
            <input
              id="list-search"
              type="search"
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              placeholder="Rechercher un prénom…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              className="min-h-11 w-full rounded-xl bg-white py-2 pr-11 pl-4 text-base text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {filters.query ? (
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-stone-500 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                aria-label="Effacer la recherche"
                onClick={() => setFilters({ ...filters, query: '' })}
              >
                <span aria-hidden="true">✕</span>
              </button>
            ) : null}
          </div>
          <div ref={filtersButtonRef} className="shrink-0">
            <Button
              variant="secondary"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
            >
              <span aria-hidden="true">⚙︎</span>
              Filtres
              {activeCount > 0 ? (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">
                  {activeCount}
                  <span className="sr-only"> filtres actifs</span>
                </span>
              ) : null}
            </Button>
          </div>
        </div>
        <ActiveFilterChips filters={effectiveFilters} onChange={setFilters} />
      </div>

      {loading ? (
        <Spinner label="Chargement des prénoms…" />
      ) : error ? (
        <p role="alert" className="m-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger les prénoms : {error}
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun prénom ne correspond"
          description="Essayez un autre mot ou retirez quelques filtres."
          action={
            <Button variant="secondary" onClick={clearAll}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-stone-500" aria-live="polite">
            <span className="font-semibold text-stone-700">
              {formatCount(filtered.length)} prénom{filtered.length > 1 ? 's' : ''}
            </span>{' '}
            · Tri : {SORT_LABELS[filters.sort]}
          </p>
          <ul className="flex flex-col gap-2">
            {visible.map((entry) => (
              <NameRow
                key={entry.id}
                entry={entry}
                myVote={mine.get(entry.id)?.value ?? null}
                partnerLiked={theirs.get(entry.id)?.value === 'like'}
                partnerName={partnerName}
                expanded={expandedId === entry.id}
                onToggle={handleToggle}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onSkip={handleSkip}
              />
            ))}
          </ul>
          {hasMore ? (
            <>
              <div ref={sentinelRef} aria-hidden="true" className="h-px" />
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setPage((current) => current + 1)}
              >
                Afficher plus ({formatCount(filtered.length - visible.length)} restants)
              </Button>
            </>
          ) : null}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        filters={effectiveFilters}
        preference={preference}
        origins={origins}
        resultCount={filtered.length}
        onChange={setFilters}
        onClose={closeSheet}
      />
    </section>
  );
}
