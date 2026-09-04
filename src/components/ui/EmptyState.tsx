import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? (
        <div className="text-5xl" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold text-stone-800">{title}</h2>
      {description ? <p className="max-w-xs text-sm text-stone-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
