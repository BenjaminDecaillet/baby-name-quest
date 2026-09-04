import type { NameFilters } from '../../data/filters';
import { listActiveFilterChips } from './filterHelpers';

interface ActiveFilterChipsProps {
  filters: NameFilters;
  onChange(next: NameFilters): void;
}

export function ActiveFilterChips({ filters, onChange }: ActiveFilterChipsProps) {
  const chips = listActiveFilterChips(filters);
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label="Filtres actifs"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rose-100 py-1 pr-2.5 pl-3 text-sm font-medium text-rose-800 transition hover:bg-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            aria-label={`Retirer le filtre ${chip.label}`}
            onClick={() => onChange(chip.remove(filters))}
          >
            <span aria-hidden="true">{chip.label}</span>
            <span aria-hidden="true" className="text-base leading-none">
              ✕
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
