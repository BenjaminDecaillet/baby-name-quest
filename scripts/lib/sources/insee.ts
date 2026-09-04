import { downloadToCache } from '../download.js';
import { extractZipEntry } from '../zip.js';
import { decodeText, detectDelimiter, parseCsv } from '../text.js';
import type { NameRecord, SourceMeta } from '../types.js';

/**
 * INSEE - "Fichier des prénoms", national file (births in France since 1900).
 * Landing page of the 2025 edition (published in 2026): https://www.insee.fr/fr/statistiques/8595130
 *
 * Two layouts are supported:
 *  - editions up to 2024: sexe;preusuel;annais;nombre
 *  - edition 2025 onwards: sexe;prenom;periode;valeur;rang (counts rounded to the nearest multiple of 5)
 */
export const INSEE_PAGE_URL = 'https://www.insee.fr/fr/statistiques/8595130';
export const INSEE_ZIP_URL =
  'https://www.insee.fr/fr/statistiques/fichier/8595130/prenoms-2025-nat_csv.zip';
export const INSEE_LICENCE = 'Licence Ouverte / Open Licence 2.0 (Etalab)';

const RARE_NAMES_MARKER = '_PRENOMS_RARES';

export interface InseeResult {
  records: NameRecord[];
  meta: SourceMeta;
}

export async function loadInsee(cacheDir: string, refresh: boolean): Promise<InseeResult> {
  console.log('INSEE - Fichier des prénoms (national)');
  const archive = await downloadToCache(INSEE_ZIP_URL, {
    cacheDir,
    fileName: 'insee-prenoms-nat.zip',
    refresh,
  });
  const { name: entryName, data } = extractZipEntry(archive, (n) =>
    n.toLowerCase().endsWith('.csv'),
  );
  const { text, encoding } = decodeText(data);
  console.log(`  entry ${entryName}, decoded as ${encoding}`);

  const firstLineEnd = text.search(/\r?\n/);
  const delimiter = detectDelimiter(firstLineEnd === -1 ? text : text.slice(0, firstLineEnd));
  const { header, rows } = parseCsv(text, delimiter);
  const columns = header.map((h) => h.toLowerCase());

  const sexIndex = columns.indexOf('sexe');
  const nameIndex = firstIndex(columns, ['prenom', 'preusuel']);
  const yearIndex = firstIndex(columns, ['periode', 'annais']);
  const countIndex = firstIndex(columns, ['valeur', 'nombre']);
  if (sexIndex === -1 || nameIndex === -1 || yearIndex === -1 || countIndex === -1) {
    throw new Error(`Unexpected INSEE header: ${header.join(delimiter)}`);
  }

  const records: NameRecord[] = [];
  let dropped = 0;
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const rawName = (row[nameIndex] ?? '').trim();
    const rawYear = (row[yearIndex] ?? '').trim();
    const rawSex = (row[sexIndex] ?? '').trim();
    const count = Number.parseInt((row[countIndex] ?? '').trim(), 10);

    // Drop the aggregated "rare names" row and rows whose birth year is unknown ("XXXX").
    if (
      rawName === RARE_NAMES_MARKER ||
      !/^\d{4}$/.test(rawYear) ||
      !Number.isFinite(count) ||
      count <= 0
    ) {
      dropped++;
      continue;
    }
    const sex = rawSex === '1' ? 'm' : rawSex === '2' ? 'f' : null;
    if (sex === null) {
      dropped++;
      continue;
    }
    const year = Number.parseInt(rawYear, 10);
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
    records.push({ name: rawName, sex, year, count });
  }
  console.log(`  ${records.length} rows kept, ${dropped} dropped, years ${minYear}-${maxYear}`);

  return {
    records,
    meta: {
      id: 'insee',
      name: 'INSEE - Fichier des prénoms (France, fichier national)',
      url: INSEE_PAGE_URL,
      licence: INSEE_LICENCE,
      years: `${minYear}-${maxYear}`,
      downloadUrls: [INSEE_ZIP_URL],
      encoding,
      firstYear: minYear,
      lastYear: maxYear,
      rows: records.length,
      notes:
        'Counts are rounded by INSEE to the nearest multiple of 5 since the 2025 edition; the "_PRENOMS_RARES" aggregate and unknown years are dropped.',
    },
  };
}

function firstIndex(columns: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const index = columns.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}
