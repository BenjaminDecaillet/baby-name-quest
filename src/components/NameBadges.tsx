import { formatCount, popularityLabel } from '../data/popularity';
import { GENDER_LABELS, TREND_LABELS, type NameEntry } from '../data/types';
import { Badge } from './ui/Badge';

export function GenderBadge({ gender }: { gender: NameEntry['gender'] }) {
  const tone = gender === 'f' ? 'rose' : gender === 'm' ? 'sky' : 'violet';
  return <Badge tone={tone}>{GENDER_LABELS[gender]}</Badge>;
}

export function TrendBadge({ trend }: { trend: NameEntry['trend'] }) {
  const tone = trend === 'up' ? 'emerald' : trend === 'down' ? 'amber' : 'stone';
  const icon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
  return (
    <Badge tone={tone}>
      <span aria-hidden="true">{icon}</span>
      {TREND_LABELS[trend]}
    </Badge>
  );
}

/** Compact facts about a name: gender, popularity bucket, trend, origin. */
export function NameBadges({ entry, compact = false }: { entry: NameEntry; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <GenderBadge gender={entry.gender} />
      <Badge tone="stone">{popularityLabel(entry)}</Badge>
      {!compact ? <TrendBadge trend={entry.trend} /> : null}
      {entry.origin ? <Badge tone="stone">Origine {entry.origin}</Badge> : null}
    </div>
  );
}

/** Detailed statistics block shown on the swipe card and in details views. */
export function NameStats({ entry }: { entry: NameEntry }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-stone-500">Naissances en France</dt>
        <dd className="font-semibold text-stone-800">
          {formatCount(entry.countFR)}
          <span className="ml-1 text-xs font-normal text-stone-500">
            dont {formatCount(entry.recentFR)} sur 5 ans
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-stone-500">Naissances en Suisse</dt>
        <dd className="font-semibold text-stone-800">
          {formatCount(entry.countCH)}
          <span className="ml-1 text-xs font-normal text-stone-500">
            dont {formatCount(entry.recentCH)} sur 5 ans
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-stone-500">Popularité</dt>
        <dd className="font-semibold text-stone-800">
          {popularityLabel(entry)}{' '}
          <span className="text-xs font-normal text-stone-500">
            (rang {formatCount(entry.popularityRank)})
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-stone-500">Tendance sur 10 ans</dt>
        <dd className="font-semibold text-stone-800">{TREND_LABELS[entry.trend]}</dd>
      </div>
      {entry.origin ? (
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Origine</dt>
          <dd className="font-semibold text-stone-800 capitalize">{entry.origin}</dd>
        </div>
      ) : null}
    </dl>
  );
}
