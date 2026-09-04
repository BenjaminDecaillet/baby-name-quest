import { useRef, type KeyboardEvent } from 'react';
import { panelId, tabId, type MatchesTab } from './matchesLogic';

export interface TabDefinition {
  id: MatchesTab;
  label: string;
  icon?: string;
  count?: number;
}

interface TabListProps {
  tabs: readonly TabDefinition[];
  selected: MatchesTab;
  onSelect: (tab: MatchesTab) => void;
}

/** Accessible tab strip: roving tabindex, arrow keys, Home/End. */
export function TabList({ tabs, selected, onSelect }: TabListProps) {
  const buttons = useRef(new Map<MatchesTab, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = tabs[next];
    onSelect(target.id);
    buttons.current.get(target.id)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Vues des favoris"
      className="flex gap-1 rounded-2xl bg-stone-200/70 p-1"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) buttons.current.set(tab.id, element);
              else buttons.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={active}
            aria-controls={panelId(tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
              active
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-stone-600 hover:bg-white/60 hover:text-stone-800'
            }`}
          >
            {tab.icon ? <span aria-hidden="true">{tab.icon}</span> : null}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 ? (
              <span
                className={`rounded-full px-1.5 text-[11px] font-bold ${
                  active ? 'bg-rose-600 text-white' : 'bg-stone-300 text-stone-800'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
