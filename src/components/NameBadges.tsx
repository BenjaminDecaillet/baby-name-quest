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

/** Meaning of the name, when the curated table knows it. */
export function NameMeaning({ entry, className = '' }: { entry: NameEntry; className?: string }) {
  if (!entry.meaning) return null;
  return (
    <p className={`text-stone-600 ${className}`}>
      <span className="sr-only">Signification : </span>
      <span aria-hidden="true">✨ </span>
      <span className="italic">{entry.meaning}</span>
    </p>
  );
}

/** Detailed statistics block shown on the swipe card and in details views. */
export function NameStats({ entry }: { entry: NameEntry }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <StatItem
        label="Naissances en France"
        value={formatCount(entry.countFR)}
        hint={`${formatCount(entry.recentFR)} sur les 5 dernières années`}
      />
      <StatItem
        label="Naissances en Suisse"
        value={formatCount(entry.countCH)}
        hint={`${formatCount(entry.recentCH)} sur les 5 dernières années`}
      />
      <StatItem
        label="Popularité"
        value={popularityLabel(entry)}
        hint={`rang ${formatCount(entry.popularityRank)}`}
      />
      <StatItem label="Tendance sur 10 ans" value={TREND_LABELS[entry.trend]} />
    </dl>
  );
}

function StatItem({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="leading-tight font-semibold text-stone-800">
        {value}
        {hint ? <span className="block text-xs font-normal text-stone-500">{hint}</span> : null}
      </dd>
    </div>
  );
}
