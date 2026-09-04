import { LocalStorageAdapter } from './localStorageAdapter';
import type { StorageAdapter } from './types';

export * from './types';

export interface StorageConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function readStorageConfig(): StorageConfig {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || undefined,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || undefined,
  };
}

export function hasSupabaseConfig(config: StorageConfig): config is Required<StorageConfig> {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

let instance: Promise<StorageAdapter> | null = null;

/**
 * Picks the adapter at runtime: Supabase when both environment variables are
 * present, the browser's local storage otherwise. The Supabase client is
 * loaded lazily so the fallback bundle stays small.
 */
export function getStorageAdapter(
  config: StorageConfig = readStorageConfig(),
): Promise<StorageAdapter> {
  if (!instance) {
    instance = hasSupabaseConfig(config)
      ? import('./supabaseAdapter').then(
          ({ SupabaseAdapter }) => new SupabaseAdapter(config.supabaseUrl, config.supabaseAnonKey),
        )
      : Promise.resolve(new LocalStorageAdapter());
  }
  return instance;
}
