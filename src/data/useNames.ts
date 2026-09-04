import { useEffect, useMemo, useState } from 'react';
import { loadNames, indexById } from './names';
import type { NameEntry } from './types';

export interface NamesState {
  names: NameEntry[];
  byId: Map<string, NameEntry>;
  loading: boolean;
  error: string | null;
}

export function useNames(): NamesState {
  const [names, setNames] = useState<NameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNames()
      .then((loaded) => {
        if (!cancelled) setNames(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Erreur de chargement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => indexById(names), [names]);
  return { names, byId, loading, error };
}
