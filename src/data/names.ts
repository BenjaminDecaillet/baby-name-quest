import type { NameEntry, NamesMeta } from './types';

let cache: Promise<NameEntry[]> | null = null;

function dataUrl(file: string): string {
  return `${import.meta.env.BASE_URL}data/${file}`;
}

/** Loads and caches the static dataset shipped in `public/data/names.json`. */
export function loadNames(): Promise<NameEntry[]> {
  if (!cache) {
    cache = fetch(dataUrl('names.json')).then(async (response) => {
      if (!response.ok) throw new Error(`Impossible de charger les prénoms (${response.status})`);
      return (await response.json()) as NameEntry[];
    });
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

export async function loadNamesMeta(): Promise<NamesMeta | null> {
  try {
    const response = await fetch(dataUrl('names.meta.json'));
    if (!response.ok) return null;
    return (await response.json()) as NamesMeta;
  } catch {
    return null;
  }
}

export function indexById(entries: NameEntry[]): Map<string, NameEntry> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}
