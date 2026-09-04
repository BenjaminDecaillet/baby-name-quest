import type { ButtonHTMLAttributes } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggleable pill used by filters and option pickers. */
export function Chip({ selected = false, className = '', type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-3.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
        selected
          ? 'bg-rose-600 text-white shadow-sm'
          : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
      } ${className}`}
      {...rest}
    />
  );
}
