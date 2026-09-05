/**
 * Build script for the first-name dataset of the app.
 *
 * Downloads the official INSEE (France) and OFS/BFS (Switzerland) files, normalises and merges them,
 * then writes public/data/names.json (compact) and public/data/names.meta.json (sources and statistics).
 *
 * Usage:  npx tsx scripts/build-names.ts [--refresh] [--max-bytes=4000000]
 *   --refresh    ignore the files cached in data/cache and download them again
 *   --max-bytes  size budget of names.json; the lowest-count tail is dropped until it fits
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatBytes } from './lib/download.js';
import { firstLetterOf, letterCount, toDisplayName, toMergeKey, toSlug } from './lib/normalize.js';
import { loadBfs } from './lib/sources/bfs.js';
import { loadInsee } from './lib/sources/insee.js';
import type { Gender, NameEntry, NameRecord, SourceMeta, Trend } from './lib/types.js';

// ---------------------------------------------------------------------------------------------
// Rules (documented in docs/donnees.md)
// ---------------------------------------------------------------------------------------------

/** Minimum number of letters for a name to be kept. */
const MIN_LETTERS = 2;
/** Minimum total number of births (all sources, all years) for a name to be kept. */
const MIN_TOTAL_COUNT = 3;
/** Share of the minority sex (FR + CH, all years) from which a name is considered mixed ("x"). */
const MIXED_GENDER_SHARE = 0.2;
/** Number of most recent years used for the popularity score. */
const RECENT_YEARS = 5;
/**
 * Weight applied to Swiss counts in the popularity score and the trend. France records roughly
 * 8 times more births per year than Switzerland (about 650 000 vs 80 000), so the weight puts both
 * countries on a comparable per-capita footing.
 */
const CH_WEIGHT = 8;
/** Trend: average of the last N years compared with the average of the same window 10 years earlier. */
const TREND_WINDOW = 3;
const TREND_OFFSET = 10;
const TREND_UP_RATIO = 1.25;
const TREND_DOWN_RATIO = 0.75;
/** Below this weighted yearly average (both windows), the trend is not meaningful and stays "stable". */
const TREND_MIN_WEIGHTED_AVERAGE = 20;
/** Default size budget for names.json. */
const DEFAULT_MAX_BYTES = 4_000_000;

// ---------------------------------------------------------------------------------------------
// Paths (resolved from this file, so the script works from any working directory and any OS)
// ---------------------------------------------------------------------------------------------

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, '..');
const cacheDir = join(rootDir, 'data', 'cache');
const originsPath = join(rootDir, 'data', 'origins.json');
const meaningsPath = join(rootDir, 'data', 'meanings.json');
const outputDir = join(rootDir, 'public', 'data');
const namesPath = join(outputDir, 'names.json');
const metaPath = join(outputDir, 'names.meta.json');

interface Options {
  refresh: boolean;
  maxBytes: number;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { refresh: false, maxBytes: DEFAULT_MAX_BYTES };
  for (const arg of argv) {
    if (arg === '--refresh') options.refresh = true;
    else if (arg.startsWith('--max-bytes='))
      options.maxBytes = Number.parseInt(arg.slice('--max-bytes='.length), 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(options.maxBytes) || options.maxBytes <= 0)
    throw new Error('Invalid --max-bytes value');
  return options;
}

// ---------------------------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------------------------

interface Aggregate {
  /** Display form candidates with their total count; the most frequent one wins. */
  displayForms: Map<string, number>;
  /** Births per year in France and in Switzerland. */
  fr: Map<number, number>;
  ch: Map<number, number>;
  /** Births per sex, all sources and years. */
  female: number;
  male: number;
}

function aggregate(
  records: NameRecord[],
  country: 'fr' | 'ch',
  into: Map<string, Aggregate>,
): void {
  for (const record of records) {
    const display = toDisplayName(record.name);
    const key = toMergeKey(display);
    let agg = into.get(key);
    if (!agg) {
      agg = { displayForms: new Map(), fr: new Map(), ch: new Map(), female: 0, male: 0 };
      into.set(key, agg);
    }
    agg.displayForms.set(display, (agg.displayForms.get(display) ?? 0) + record.count);
    const byYear = agg[country];
    byYear.set(record.year, (byYear.get(record.year) ?? 0) + record.count);
    if (record.sex === 'f') agg.female += record.count;
    else agg.male += record.count;
  }
}

function sumYears(byYear: Map<number, number>, from: number, to: number): number {
  let total = 0;
  for (const [year, count] of byYear) {
    if (year >= from && year <= to) total += count;
  }
  return total;
}

function sumAll(byYear: Map<number, number>): number {
  let total = 0;
  for (const count of byYear.values()) total += count;
  return total;
}

function pickDisplayForm(forms: Map<string, number>): string {
  let best = '';
  let bestCount = -1;
  for (const [form, count] of forms) {
    if (count > bestCount || (count === bestCount && form < best)) {
      best = form;
      bestCount = count;
    }
  }
  return best;
}

function genderOf(female: number, male: number): Gender {
  const total = female + male;
  if (total === 0) return 'x';
  const minorityShare = Math.min(female, male) / total;
  if (minorityShare >= MIXED_GENDER_SHARE) return 'x';
  return female >= male ? 'f' : 'm';
}

function weightedAverage(agg: Aggregate, from: number, to: number): number {
  const years = to - from + 1;
  return (sumYears(agg.fr, from, to) + CH_WEIGHT * sumYears(agg.ch, from, to)) / years;
}

function trendOf(agg: Aggregate, lastYear: number): Trend {
  const recent = weightedAverage(agg, lastYear - TREND_WINDOW + 1, lastYear);
  const past = weightedAverage(
    agg,
    lastYear - TREND_OFFSET - TREND_WINDOW + 1,
    lastYear - TREND_OFFSET,
  );
  if (Math.max(recent, past) < TREND_MIN_WEIGHTED_AVERAGE) return 'stable';
  if (past === 0) return 'up';
  const ratio = recent / past;
  if (ratio >= TREND_UP_RATIO) return 'up';
  if (ratio <= TREND_DOWN_RATIO) return 'down';
  return 'stable';
}

interface Candidate {
  entry: NameEntry;
  total: number;
  score: number;
}

/** Curated table `{ "<name in lowercase, accents kept>": "<value>" }`, keyed like the merge key. */
function loadCuratedTable(path: string): Map<string, string> {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
  const table = new Map<string, string>();
  for (const [name, value] of Object.entries(raw)) {
    const trimmed = value.trim();
    if (trimmed) table.set(name.normalize('NFC').toLowerCase().trim(), trimmed);
  }
  return table;
}

function loadOrigins(): Map<string, string> {
  return loadCuratedTable(originsPath);
}

function loadMeanings(): Map<string, string> {
  return loadCuratedTable(meaningsPath);
}

function assignIds(candidates: Candidate[]): void {
  // The most frequent name gets the plain slug; homographs without accents get a numeric suffix.
  const taken = new Set<string>();
  const byTotal = [...candidates].sort(
    (a, b) => b.total - a.total || a.entry.name.localeCompare(b.entry.name, 'fr'),
  );
  for (const candidate of byTotal) {
    const base = `${toSlug(candidate.entry.name)}-${candidate.entry.gender}`;
    let id = base;
    let suffix = 2;
    while (taken.has(id)) {
      id = `${base}-${suffix}`;
      suffix++;
    }
    taken.add(id);
    candidate.entry.id = id;
  }
}

function rank(candidates: Candidate[]): void {
  candidates.sort(
    (a, b) =>
      b.score - a.score || b.total - a.total || a.entry.name.localeCompare(b.entry.name, 'fr'),
  );
  candidates.forEach((candidate, index) => {
    candidate.entry.popularityRank = index + 1;
  });
}

function serialize(candidates: Candidate[]): string {
  return JSON.stringify(candidates.map((c) => c.entry));
}

/**
 * Enforce the size budget: keep the names with the highest total counts, dropping the tail below a
 * count threshold so that the selection stays deterministic. Returns the applied threshold.
 */
function enforceSizeBudget(
  candidates: Candidate[],
  maxBytes: number,
): { kept: Candidate[]; minTotal: number } {
  if (Buffer.byteLength(serialize(candidates), 'utf8') <= maxBytes) {
    return { kept: candidates, minTotal: MIN_TOTAL_COUNT };
  }
  const byTotal = [...candidates].sort((a, b) => b.total - a.total);
  let bytes = 2; // brackets
  let cutIndex = byTotal.length;
  for (let i = 0; i < byTotal.length; i++) {
    bytes += Buffer.byteLength(JSON.stringify(byTotal[i].entry), 'utf8') + 1;
    if (bytes > maxBytes) {
      cutIndex = i;
      break;
    }
  }
  // Raise the threshold to the next count value so that all names with the same total are treated alike.
  let minTotal = cutIndex < byTotal.length ? byTotal[cutIndex].total + 1 : MIN_TOTAL_COUNT;
  let kept = candidates.filter((c) => c.total >= minTotal);
  while (Buffer.byteLength(serialize(kept), 'utf8') > maxBytes) {
    minTotal++;
    kept = candidates.filter((c) => c.total >= minTotal);
  }
  return { kept, minTotal };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  const insee = await loadInsee(cacheDir, options.refresh);
  const bfs = await loadBfs(cacheDir, options.refresh);
  const sources: SourceMeta[] = [insee.meta, bfs.meta];

  console.log('Merging sources');
  const aggregates = new Map<string, Aggregate>();
  aggregate(insee.records, 'fr', aggregates);
  aggregate(bfs.records, 'ch', aggregates);
  console.log(`  ${aggregates.size} distinct names (case-insensitive, accents kept)`);

  const lastYear = Math.max(insee.meta.lastYear, bfs.meta.lastYear);
  const recentFrom = lastYear - RECENT_YEARS + 1;
  const origins = loadOrigins();
  const meanings = loadMeanings();
  console.log(
    `  last available year: ${lastYear}; recent window ${recentFrom}-${lastYear}; ${origins.size} curated origins; ${meanings.size} curated meanings`,
  );

  const candidates: Candidate[] = [];
  let droppedShort = 0;
  let droppedRare = 0;
  for (const agg of aggregates.values()) {
    const name = pickDisplayForm(agg.displayForms);
    const countFR = sumAll(agg.fr);
    const countCH = sumAll(agg.ch);
    const total = countFR + countCH;
    if (letterCount(name) < MIN_LETTERS) {
      droppedShort++;
      continue;
    }
    if (total < MIN_TOTAL_COUNT) {
      droppedRare++;
      continue;
    }
    const recentFR = sumYears(agg.fr, recentFrom, lastYear);
    const recentCH = sumYears(agg.ch, recentFrom, lastYear);
    const entry: NameEntry = {
      id: '',
      name,
      gender: genderOf(agg.female, agg.male),
      countFR,
      countCH,
      recentFR,
      recentCH,
      popularityRank: 0,
      trend: trendOf(agg, lastYear),
      firstLetter: firstLetterOf(name),
      length: letterCount(name),
    };
    const key = toMergeKey(name);
    const origin = origins.get(key);
    if (origin) entry.origin = origin;
    const meaning = meanings.get(key);
    if (meaning) entry.meaning = meaning;
    candidates.push({ entry, total, score: recentFR + CH_WEIGHT * recentCH });
  }
  console.log(
    `  ${candidates.length} names kept (${droppedShort} too short, ${droppedRare} with fewer than ${MIN_TOTAL_COUNT} births)`,
  );

  // Ids and ranks are assigned before measuring the size, then ranks are recomputed on the final selection
  // (dropping the tail can only shorten them, so the budget still holds).
  assignIds(candidates);
  rank(candidates);
  const { kept, minTotal } = enforceSizeBudget(candidates, options.maxBytes);
  if (kept.length < candidates.length) {
    console.log(
      `  size budget ${options.maxBytes} bytes: dropped ${candidates.length - kept.length} names with fewer than ${minTotal} births in total`,
    );
    rank(kept);
  }

  const json = serialize(kept);
  writeFileSync(namesPath, json, { encoding: 'utf8' });
  const sizeBytes = Buffer.byteLength(json, 'utf8');

  const counts = {
    total: kept.length,
    f: 0,
    m: 0,
    x: 0,
    withOrigin: 0,
    withMeaning: 0,
    withCH: 0,
  };
  for (const { entry } of kept) {
    counts[entry.gender]++;
    if (entry.origin) counts.withOrigin++;
    if (entry.meaning) counts.withMeaning++;
    if (entry.countCH > 0) counts.withCH++;
  }
  const meta = {
    generatedAt: new Date().toISOString(),
    total: kept.length,
    lastYear,
    recentYears: { from: recentFrom, to: lastYear },
    sources,
    rules: {
      minLetters: MIN_LETTERS,
      minTotalCount: minTotal,
      mixedGenderShare: MIXED_GENDER_SHARE,
      popularityScore: `recentFR + ${CH_WEIGHT} * recentCH (last ${RECENT_YEARS} years)`,
      trend: {
        window: TREND_WINDOW,
        offsetYears: TREND_OFFSET,
        upRatio: TREND_UP_RATIO,
        downRatio: TREND_DOWN_RATIO,
        minWeightedAverage: TREND_MIN_WEIGHTED_AVERAGE,
        chWeight: CH_WEIGHT,
      },
      maxBytes: options.maxBytes,
    },
    counts,
    sizeBytes,
  };
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, { encoding: 'utf8' });

  printSummary(kept, sizeBytes, counts);
  console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
}

function printSummary(
  kept: Candidate[],
  sizeBytes: number,
  counts: {
    total: number;
    f: number;
    m: number;
    x: number;
    withOrigin: number;
    withMeaning: number;
    withCH: number;
  },
): void {
  const top = (gender: Gender) =>
    kept
      .filter((c) => c.entry.gender === gender)
      .slice(0, 10)
      .map((c) => `${c.entry.name} (${c.entry.popularityRank})`)
      .join(', ');
  console.log('Summary');
  console.log(
    `  names: ${counts.total} (f ${counts.f}, m ${counts.m}, x ${counts.x}); with CH data: ${counts.withCH}; with origin: ${counts.withOrigin}; with meaning: ${counts.withMeaning}`,
  );
  console.log(`  top 10 girls: ${top('f')}`);
  console.log(`  top 10 boys:  ${top('m')}`);
  console.log(`  names.json: ${formatBytes(sizeBytes)} -> ${namesPath}`);
  console.log(`  names.meta.json -> ${metaPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
