import { downloadToCache } from '../download.js';
import { decodeText, parseCsv } from '../text.js';
import type { NameRecord, SourceMeta } from '../types.js';

/**
 * OFS/BFS - "Prénoms des nouveau-nés" (first names of newborns, Switzerland, since 2000).
 * Landing page: https://www.bfs.admin.ch/bfs/fr/home/statistiques/population/naissances-deces/prenoms-nouveaux-nes.html
 * The data is served by the SDMX REST API behind stats.swiss (dataflows DF_BEVNAT_PRENOMS_1 for boys and
 * DF_BEVNAT_PRENOMS_2 for girls). The key "8100..A.COUNT" restricts the query to Switzerland as a whole
 * (GEO=8100), all names, annual frequency and the COUNT unit (the RANK unit is not needed).
 */
export const BFS_PAGE_URL =
  'https://www.bfs.admin.ch/bfs/fr/home/statistiques/population/naissances-deces/prenoms-nouveaux-nes.html';
export const BFS_LICENCE = 'OPEN-BY (utilisation libre, indication de la source obligatoire)';

const SDMX_BASE = 'https://disseminate.stats.swiss/rest/data/CH1.BEVNAT';

interface Dataflow {
  id: string;
  sex: 'm' | 'f';
  fileName: string;
}

const DATAFLOWS: Dataflow[] = [
  { id: 'DF_BEVNAT_PRENOMS_1', sex: 'm', fileName: 'bfs-prenoms-garcons.csv' },
  { id: 'DF_BEVNAT_PRENOMS_2', sex: 'f', fileName: 'bfs-prenoms-filles.csv' },
];

export function bfsDataflowUrl(dataflowId: string): string {
  return `${SDMX_BASE},${dataflowId},1.0.0/8100..A.COUNT?format=csvfilewithlabels&dimensionAtObservation=AllDimensions`;
}

export interface BfsResult {
  records: NameRecord[];
  meta: SourceMeta;
}

export async function loadBfs(cacheDir: string, refresh: boolean): Promise<BfsResult> {
  console.log('OFS/BFS - Prénoms des nouveau-nés (Suisse)');
  const records: NameRecord[] = [];
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;
  let encoding = 'utf-8';

  for (const dataflow of DATAFLOWS) {
    const bytes = await downloadToCache(bfsDataflowUrl(dataflow.id), {
      cacheDir,
      fileName: dataflow.fileName,
      refresh,
      // The stats.swiss API rejects the wildcard Accept-Language sent by default by Node's fetch (HTTP 500).
      headers: { Accept: 'text/csv', 'Accept-Language': 'fr' },
    });
    const decoded = decodeText(bytes);
    encoding = decoded.encoding;
    const { header, rows } = parseCsv(decoded.text, ',');

    // SDMX-CSV with labels: every dimension code column is followed by its label column.
    const nameCodeIndex = header.indexOf('NAME');
    const nameIndex = nameCodeIndex === -1 ? -1 : nameCodeIndex + 1;
    const unitIndex = header.indexOf('UNIT');
    const yearIndex = header.indexOf('TIME_PERIOD');
    const valueIndex = header.indexOf('OBS_VALUE');
    if (nameIndex === -1 || yearIndex === -1 || valueIndex === -1) {
      throw new Error(`Unexpected BFS header for ${dataflow.id}: ${header.join(',')}`);
    }

    let kept = 0;
    for (const row of rows) {
      if (unitIndex !== -1 && row[unitIndex] !== 'COUNT') continue;
      const rawName = (row[nameIndex] ?? '').trim();
      const rawYear = (row[yearIndex] ?? '').trim();
      const count = Number.parseInt((row[valueIndex] ?? '').trim(), 10);
      if (rawName.length === 0 || !/^\d{4}$/.test(rawYear) || !Number.isFinite(count) || count <= 0)
        continue;
      const year = Number.parseInt(rawYear, 10);
      if (year < minYear) minYear = year;
      if (year > maxYear) maxYear = year;
      records.push({ name: rawName, sex: dataflow.sex, year, count });
      kept++;
    }
    console.log(`  ${dataflow.id} (${dataflow.sex}): ${kept} rows with a positive count`);
  }
  console.log(`  ${records.length} rows kept, years ${minYear}-${maxYear}`);

  return {
    records,
    meta: {
      id: 'bfs',
      name: 'OFS/BFS - Prénoms des nouveau-nés (Suisse)',
      url: BFS_PAGE_URL,
      licence: BFS_LICENCE,
      years: `${minYear}-${maxYear}`,
      downloadUrls: DATAFLOWS.map((d) => bfsDataflowUrl(d.id)),
      encoding,
      firstYear: minYear,
      lastYear: maxYear,
      rows: records.length,
      notes:
        'Only the first names published by the OFS for newborns (about 2 700 per sex) are available; rarer names are not published. Whole of Switzerland (GEO=8100), COUNT unit.',
    },
  };
}
