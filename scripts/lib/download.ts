import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DownloadOptions {
  /** Directory used to cache downloaded files. */
  cacheDir: string;
  /** Local file name inside the cache directory. */
  fileName: string;
  /** When true, ignore any cached copy and download again. */
  refresh?: boolean;
  /** Extra request headers (e.g. Accept). */
  headers?: Record<string, string>;
  /** Timeout in milliseconds for the whole request. */
  timeoutMs?: number;
}

/**
 * Download a URL into the cache directory (or reuse the cached copy) and return the raw bytes.
 * Uses the global fetch of Node >= 18, so no external tool is required.
 */
export async function downloadToCache(url: string, options: DownloadOptions): Promise<Buffer> {
  const { cacheDir, fileName, refresh = false, headers = {}, timeoutMs = 10 * 60 * 1000 } = options;
  mkdirSync(cacheDir, { recursive: true });
  const target = join(cacheDir, fileName);

  if (!refresh && existsSync(target)) {
    const cached = readFileSync(target);
    if (cached.length > 0) {
      console.log(`  cache hit: ${fileName} (${formatBytes(cached.length)})`);
      return cached;
    }
  }

  console.log(`  downloading ${url}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error(`Empty response for ${url}`);
    }
    writeFileSync(target, bytes);
    console.log(`  saved ${fileName} (${formatBytes(bytes.length)})`);
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
