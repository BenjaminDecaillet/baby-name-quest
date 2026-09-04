/**
 * Name normalisation helpers: display form, deduplication key, slug, first letter and letter count.
 */

/** Characters that separate the parts of a compound name. Each part is capitalised independently. */
const PART_SEPARATOR = /([\s\-'’])/;

/**
 * Build the display form of a name: first letter of each part in upper case, the rest in lower case.
 * Accents are preserved ("ZOÉ" -> "Zoé", "JEAN-PIERRE" -> "Jean-Pierre", "ANNE MARIE" -> "Anne Marie").
 * After an apostrophe the next part is capitalised only when the previous part is a single letter
 * ("N'GUESSAN" -> "N'Guessan", but "ABD'ALLAH" -> "Abd'allah" and the Breton "ARC'HANTAEL" -> "Arc'hantael").
 */
export function toDisplayName(raw: string): string {
  const cleaned = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  const tokens = cleaned.split(PART_SEPARATOR);
  return tokens
    .map((part, index) => {
      if (part.length === 0 || PART_SEPARATOR.test(part)) return part;
      const lower = part.toLowerCase();
      const previousSeparator = tokens[index - 1];
      const previousPart = tokens[index - 2];
      if (
        index > 0 &&
        (previousSeparator === "'" || previousSeparator === '’') &&
        previousPart !== undefined &&
        previousPart.length > 1
      ) {
        return lower;
      }
      const chars = Array.from(lower);
      chars[0] = chars[0].toUpperCase();
      return chars.join('');
    })
    .join('')
    .replace(/’/g, "'");
}

/** Deduplication key: case-insensitive, accents kept ("Zoé" and "Zoe" stay distinct). */
export function toMergeKey(displayName: string): string {
  return displayName.normalize('NFC').toLowerCase();
}

/** Fallback transliterations for letters that NFD decomposition does not split. */
const SPECIAL_LETTERS: Record<string, string> = {
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ł: 'l',
  ß: 'ss',
  þ: 'th',
  ð: 'd',
  ı: 'i',
  ħ: 'h',
  ŧ: 't',
};

/** Remove diacritics and map special Latin letters to their ASCII base letters. */
export function stripAccents(value: string): string {
  return Array.from(value.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = SPECIAL_LETTERS[lower];
      if (mapped === undefined) return ch;
      return ch === lower ? mapped : mapped.toUpperCase();
    })
    .join('');
}

/** URL-friendly slug: ASCII lower case, hyphens between parts ("Jean-Pierre" -> "jean-pierre"). */
export function toSlug(displayName: string): string {
  return stripAccents(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** First letter in upper case without accent ("Élodie" -> "E"). */
export function firstLetterOf(displayName: string): string {
  const stripped = stripAccents(displayName).toUpperCase();
  const match = stripped.match(/[A-Z]/);
  return match ? match[0] : stripped.charAt(0);
}

/** Number of letters, ignoring hyphens, spaces and apostrophes. */
export function letterCount(displayName: string): number {
  let count = 0;
  for (const ch of displayName) {
    if (/\p{L}/u.test(ch)) count++;
  }
  return count;
}
