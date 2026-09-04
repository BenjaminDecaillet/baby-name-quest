import { useEffect, useState, type CSSProperties } from 'react';
import { GenderBadge, NameStats, TrendBadge } from '../../components/NameBadges';
import { Badge } from '../../components/ui/Badge';
import type { NameEntry } from '../../data/types';
import type { VoteValue } from '../../storage';
import { useSwipeGesture, type SwipeDirection } from './useSwipeGesture';

export const SWIPE_THRESHOLD = 80;
/** Duration (ms) of the fly-out animation of a decided card. */
export const EXIT_DURATION = 260;

export interface CardFaceProps {
  entry: NameEntry;
  /** Display name of the partner when they already liked this name. */
  likedByPartner?: string | null;
  /** Overlay label to preview the decision while dragging. */
  overlay?: { direction: SwipeDirection; opacity: number } | null;
  style?: CSSProperties;
  className?: string;
}

/** Visual content of a card, shared by the live card and the animated ghost. */
export function CardFace({
  entry,
  likedByPartner = null,
  overlay = null,
  style,
  className = '',
}: CardFaceProps) {
  return (
    <div
      style={style}
      className={`relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 shadow-lg ring-1 ring-stone-200 ${className}`}
    >
      {overlay ? (
        <span
          aria-hidden="true"
          style={{ opacity: overlay.opacity }}
          className={`absolute top-6 rounded-xl border-4 px-3 py-1 text-2xl font-extrabold uppercase tracking-wider ${
            overlay.direction === 'right'
              ? 'left-6 -rotate-12 border-emerald-500 text-emerald-600'
              : 'right-6 rotate-12 border-red-500 text-red-600'
          }`}
        >
          {overlay.direction === 'right' ? "J'aime" : 'Je passe'}
        </span>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <GenderBadge gender={entry.gender} />
        <TrendBadge trend={entry.trend} />
        {entry.origin ? <Badge tone="stone">Origine {entry.origin}</Badge> : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
        <h2 className="max-w-full text-4xl leading-tight font-extrabold break-words text-stone-800 sm:text-6xl">
          {entry.name}
        </h2>
        {likedByPartner ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            <span aria-hidden="true">❤️</span>
            Aimé aussi par {likedByPartner}
          </p>
        ) : null}
      </div>

      <NameStats entry={entry} />
    </div>
  );
}

export interface SwipeCardProps {
  entry: NameEntry;
  likedByPartner?: string | null;
  reducedMotion: boolean;
  onDecide: (value: VoteValue, fromDx: number) => void;
}

/** The card on top of the stack: draggable horizontally, announces the decision preview. */
export function SwipeCard({ entry, likedByPartner, reducedMotion, onDecide }: SwipeCardProps) {
  const gesture = useSwipeGesture({
    threshold: SWIPE_THRESHOLD,
    reducedMotion,
    onSwipe: (direction, fromDx) => onDecide(direction === 'right' ? 'like' : 'skip', fromDx),
  });
  const previewDirection: SwipeDirection | null =
    gesture.dx === 0 ? null : gesture.dx > 0 ? 'right' : 'left';

  return (
    <article
      aria-label={`Prénom ${entry.name}`}
      data-testid="swipe-card"
      {...gesture.handlers}
      className="flex flex-1 touch-pan-y flex-col select-none"
    >
      <CardFace
        entry={entry}
        likedByPartner={likedByPartner}
        style={gesture.style}
        overlay={
          previewDirection ? { direction: previewDirection, opacity: gesture.progress } : null
        }
        className={gesture.dragging ? 'cursor-grabbing' : 'cursor-grab'}
      />
    </article>
  );
}

export interface GhostCardProps {
  entry: NameEntry;
  direction: SwipeDirection;
  fromDx: number;
}

/** Non-interactive copy of a decided card flying off the screen. */
export function GhostCard({ entry, direction, fromDx }: GhostCardProps) {
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFlying(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const distance = typeof window === 'undefined' ? 600 : window.innerWidth * 1.2;
  const targetX = direction === 'right' ? distance : -distance;
  const x = flying ? targetX : fromDx;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col">
      <CardFace
        entry={entry}
        overlay={{ direction, opacity: 1 }}
        style={{
          transform: `translateX(${x}px) rotate(${x * 0.05}deg)`,
          opacity: flying ? 0 : 1,
          transition: `transform ${EXIT_DURATION}ms ease-in, opacity ${EXIT_DURATION}ms ease-in`,
        }}
      />
    </div>
  );
}
