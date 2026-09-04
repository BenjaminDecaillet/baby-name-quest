/**
 * Text helpers: explicit character-set detection and a small CSV parser.
 */

/**
 * Decode bytes to a string. A UTF-8 BOM is stripped; when the bytes are not valid UTF-8 the
 * content is decoded as ISO-8859-1 (Latin-1), the legacy encoding of some INSEE files.
 */
export function decodeText(bytes: Buffer): { text: string; encoding: 'utf-8' | 'iso-8859-1' } {
  let payload = bytes;
  if (payload.length >= 3 && payload[0] === 0xef && payload[1] === 0xbb && payload[2] === 0xbf) {
    payload = payload.subarray(3);
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(payload);
    return { text, encoding: 'utf-8' };
  } catch {
    const text = new TextDecoder('iso-8859-1').decode(payload);
    return { text, encoding: 'iso-8859-1' };
  }
}

/** Split text into lines, accepting CRLF, LF and CR line endings; the trailing empty line is dropped. */
export function splitLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Parse one CSV line. Handles quoted fields (with doubled quotes as escapes) and a configurable delimiter.
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  if (!line.includes('"')) {
    return line.split(delimiter);
  }
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Parse a whole CSV document into a header and rows (as arrays of strings). */
export function parseCsv(text: string, delimiter: string): { header: string[]; rows: string[][] } {
  const lines = splitLines(text);
  if (lines.length === 0) {
    return { header: [], rows: [] };
  }
  const header = parseCsvLine(lines[0], delimiter).map((h) => h.trim());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].length === 0) continue;
    rows.push(parseCsvLine(lines[i], delimiter));
  }
  return { header, rows };
}

/** Detect the delimiter of a CSV header line among the usual candidates. */
export function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t', '|'];
  let best = ';';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}
