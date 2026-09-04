import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useNames } from '../../data/useNames';
import { useSession } from '../../store/SessionContext';
import { useVotes } from '../../store/useVotes';
import { MatchesTab } from './MatchesTab';
import { MyFavoritesTab } from './MyFavoritesTab';
import { TheirFavoritesTab } from './TheirFavoritesTab';
import { TabList, type TabDefinition } from './TabList';
import { UndoBar } from './UndoBar';
import { useUndoRemove } from './useUndoRemove';
import {
  TAB_PARAM,
  panelId,
  parseTab,
  resolveEntries,
  tabId,
  theirTabLabel,
  type MatchesTab as Tab,
} from './matchesLogic';

export function MatchesPage() {
  const { status, profile, partner, couple, vote, setNote, saveMatchOrder } = useSession();
  const { mine, theirs, myLikes, theirLikes, matches } = useVotes();
  const { byId, loading, error } = useNames();
  const [searchParams, setSearchParams] = useSearchParams();
  const undoRemove = useUndoRemove();

  const tab = parseTab(searchParams.get(TAB_PARAM));
  const selectTab = useCallback(
    (next: Tab) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set(TAB_PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const preference = profile?.genderPreference ?? 'both';
  const matchEntries = useMemo(
    () => resolveEntries(matches, byId, preference),
    [matches, byId, preference],
  );
  const myEntries = useMemo(
    () => resolveEntries(myLikes, byId, preference),
    [myLikes, byId, preference],
  );
  const theirEntries = useMemo(
    () => resolveEntries(theirLikes, byId, preference),
    [theirLikes, byId, preference],
  );

  const tabs: TabDefinition[] = [
    { id: 'matchs', label: 'Nos matchs', icon: '💞', count: matchEntries.length },
    { id: 'moi', label: 'Mes favoris' },
    { id: 'elle', label: theirTabLabel(partner) },
  ];

  const busy = status === 'loading' || loading;

  return (
    <section className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-800">Nos favoris</h1>
        <p className="mt-1 text-sm text-stone-500">
          Vos coups de cœur, ceux de votre moitié, et ceux que vous partagez.
        </p>
      </header>

      <TabList tabs={tabs} selected={tab} onSelect={selectTab} />

      <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
        {busy ? (
          <Spinner label="Chargement des prénoms…" />
        ) : error ? (
          <EmptyState
            icon="😕"
            title="Impossible de charger les prénoms"
            description="Vérifiez votre connexion puis rechargez la page."
          />
        ) : tab === 'matchs' ? (
          <MatchesTab
            entries={matchEntries}
            mine={mine}
            theirs={theirs}
            partner={partner}
            onReorder={(ids) => void saveMatchOrder(ids)}
            onRemove={undoRemove.remove}
          />
        ) : tab === 'moi' ? (
          <MyFavoritesTab
            entries={myEntries}
            mine={mine}
            theirs={theirs}
            onSaveNote={(id, note) => void setNote(id, note)}
            onRemove={undoRemove.remove}
          />
        ) : (
          <TheirFavoritesTab
            entries={theirEntries}
            mine={mine}
            theirs={theirs}
            partner={partner}
            couple={couple}
            onLike={(entry) => void vote(entry.id, 'like')}
          />
        )}
      </div>

      <UndoBar
        pending={undoRemove.pending}
        onUndo={undoRemove.undo}
        onDismiss={undoRemove.dismiss}
      />
    </section>
  );
}
