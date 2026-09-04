import { matchesPreference } from '../../data/filters';
import type { GenderPreference, NameEntry } from '../../data/types';

/** Sub-views of the « Nos favoris » screen, persisted in the `?vue=` search param. */
export type MatchesTab = 'matchs' | 'moi' | 'elle';

export const TAB_PARAM = 'vue';
export const DEFAULT_TAB: MatchesTab = 'matchs';
export const MATCHES_TABS: readonly MatchesTab[] = ['matchs', 'moi', 'elle'];

export function isMatchesTab(value: string | null | undefined): value is MatchesTab {
  return value !== null && value !== undefined && MATCHES_TABS.includes(value as MatchesTab);
}

/** Tolerant parser: anything unknown falls back to « Nos matchs ». */
export function parseTab(raw: string | null | undefined): MatchesTab {
  return isMatchesTab(raw) ? raw : DEFAULT_TAB;
}

/** DOM ids linking each tab button to its panel (`aria-controls` / `aria-labelledby`). */
export function tabId(tab: MatchesTab): string {
  return `favoris-tab-${tab}`;
}

export function panelId(tab: MatchesTab): string {
  return `favoris-panel-${tab}`;
}

/**
 * Returns a copy of `items` with the element at `from` moved to `to`.
 * Out-of-range indexes or a no-op move return an unchanged copy.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const inRange = (index: number) => Number.isInteger(index) && index >= 0 && index < items.length;
  if (from === to || !inRange(from) || !inRange(to)) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Resolves vote ids to dataset entries, keeping the incoming order, skipping
 * unknown ids and names outside the couple's gender preference.
 */
export function resolveEntries(
  ids: readonly string[],
  byId: Map<string, NameEntry>,
  preference: GenderPreference = 'both',
): NameEntry[] {
  const result: NameEntry[] = [];
  for (const id of ids) {
    const entry = byId.get(id);
    if (entry && matchesPreference(entry, preference)) result.push(entry);
  }
  return result;
}

interface PartnerLike {
  displayName: string;
}

/** Trimmed display name of the partner, or null when unknown. */
export function partnerName(partner: PartnerLike | null | undefined): string | null {
  const name = partner?.displayName.trim();
  return name ? name : null;
}

export function theirTabLabel(partner: PartnerLike | null | undefined): string {
  const name = partnerName(partner);
  return name ? `Favoris de ${name}` : 'Ses favoris';
}

export function sharedOrderCaption(partner: PartnerLike | null | undefined): string {
  const name = partnerName(partner);
  return `Ordre partagé avec ${name ?? 'votre moitié'}`;
}

export function partnerNoteLabel(partner: PartnerLike | null | undefined): string {
  const name = partnerName(partner);
  return name ? `Note de ${name}` : 'Sa note';
}

/** « Aucun prénom », « 1 prénom », « 12 prénoms ». */
export function countLabel(count: number, singular = 'prénom', plural = `${singular}s`): string {
  if (count <= 0) return `Aucun ${singular}`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export const MEDALS = ['🥇', '🥈', '🥉'] as const;
export const PODIUM_LABELS = ['Première place', 'Deuxième place', 'Troisième place'] as const;
export const PODIUM_SIZE = MEDALS.length;
