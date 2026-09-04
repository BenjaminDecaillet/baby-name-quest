import type { ReactNode } from 'react';

export interface SwipeActionsProps {
  onSkip: () => void;
  onLike: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500';

function RoundButton({
  label,
  caption,
  icon,
  className,
  onClick,
  disabled = false,
}: {
  label: string;
  caption: string;
  icon: ReactNode;
  className: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center rounded-full transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${FOCUS} ${className}`}
      >
        <span aria-hidden="true">{icon}</span>
      </button>
      <span aria-hidden="true" className="text-xs font-semibold text-stone-500">
        {caption}
      </span>
    </div>
  );
}

/** Thumb-reachable decision buttons shown under the card. */
export function SwipeActions({
  onSkip,
  onLike,
  onUndo,
  canUndo,
  disabled = false,
}: SwipeActionsProps) {
  return (
    <div
      className="flex items-end justify-center gap-6 sm:gap-10"
      role="group"
      aria-label="Décision"
    >
      <RoundButton
        label="Annuler la dernière décision"
        caption="Annuler"
        icon="↺"
        onClick={onUndo}
        disabled={!canUndo}
        className="h-12 w-12 bg-white text-xl text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
      />
      <RoundButton
        label="Je passe"
        caption="Je passe"
        icon="✕"
        onClick={onSkip}
        disabled={disabled}
        className="h-16 w-16 bg-white text-2xl font-bold text-red-500 shadow-md ring-1 ring-stone-200 hover:bg-red-50"
      />
      <RoundButton
        label="J'aime"
        caption="J'aime"
        icon="❤"
        onClick={onLike}
        disabled={disabled}
        className="h-20 w-20 bg-rose-600 text-3xl text-white shadow-lg hover:bg-rose-700"
      />
    </div>
  );
}
