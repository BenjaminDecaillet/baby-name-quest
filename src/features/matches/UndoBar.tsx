import { Button } from '../../components/ui/Button';
import type { PendingRemoval } from './useUndoRemove';

interface UndoBarProps {
  pending: PendingRemoval | null;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Floating bar above the bottom navigation offering « Annuler ». */
export function UndoBar({ pending, onUndo, onDismiss }: UndoBarProps) {
  if (!pending) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-stone-800 py-2 pr-2 pl-4 text-sm text-white shadow-lg"
    >
      <p>
        <strong>{pending.name}</strong> ne fait plus partie de vos favoris.
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" className="text-rose-200 hover:bg-stone-700" onClick={onUndo}>
          Annuler
        </Button>
        <Button
          variant="ghost"
          className="text-stone-300 hover:bg-stone-700"
          aria-label="Fermer"
          onClick={onDismiss}
        >
          <span aria-hidden="true">✕</span>
        </Button>
      </div>
    </div>
  );
}
