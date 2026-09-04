import type { ReactNode } from 'react';

type Tone = 'rose' | 'sky' | 'stone' | 'emerald' | 'amber' | 'violet';

const TONES: Record<Tone, string> = {
  rose: 'bg-rose-100 text-rose-800',
  sky: 'bg-sky-100 text-sky-800',
  stone: 'bg-stone-100 text-stone-700',
  emerald: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  violet: 'bg-violet-100 text-violet-800',
};

export function Badge({
  tone = 'stone',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
