import { useCallback, useEffect, useRef, useState } from 'react';
import type { NameEntry } from '../../data/types';
import { useSession } from '../../store/SessionContext';
import { useVotes } from '../../store/useVotes';

export const UNDO_DELAY_MS = 5000;

export interface PendingRemoval {
  id: string;
  name: string;
  note: string | null;
}

/**
 * Removes a like immediately (optimistic in the store) while offering a short
 * window to put it back, note included.
 */
export function useUndoRemove() {
  const { vote, removeVote } = useSession();
  const { mine } = useVotes();
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const remove = useCallback(
    (entry: NameEntry) => {
      const note = mine.get(entry.id)?.note ?? null;
      void removeVote(entry.id);
      clearTimer();
      setPending({ id: entry.id, name: entry.name, note });
      timer.current = setTimeout(() => setPending(null), UNDO_DELAY_MS);
    },
    [mine, removeVote, clearTimer],
  );

  const undo = useCallback(() => {
    if (!pending) return;
    clearTimer();
    setPending(null);
    void vote(pending.id, 'like', pending.note);
  }, [pending, vote, clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setPending(null);
  }, [clearTimer]);

  return { pending, remove, undo, dismiss };
}
