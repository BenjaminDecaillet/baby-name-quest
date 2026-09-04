import { formatCount } from '../../data/popularity';
import type { SwipeProgress as Progress } from './swipeQueue';

/** Counter and thin bar showing how much of the pool has been reviewed. */
export function SwipeProgress({ progress }: { progress: Progress }) {
  const label = `${formatCount(progress.seen)} / ${formatCount(progress.total)} prénoms vus`;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-center text-xs font-semibold text-stone-500">{label}</p>
      <div
        role="progressbar"
        aria-label="Progression"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.seen}
        aria-valuetext={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
      >
        <div
          className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
