import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameEntry } from '../../data/types';
import { LocalStorageAdapter } from '../../storage/localStorageAdapter';
import type { Profile, Vote } from '../../storage/types';
import { SessionProvider } from '../../store/SessionContext';
import { MatchesPage } from './MatchesPage';

const entry = (
  id: string,
  name: string,
  gender: NameEntry['gender'],
  origin?: string,
): NameEntry => ({
  id,
  name,
  gender,
  countFR: 1000,
  countCH: 100,
  recentFR: 100,
  recentCH: 10,
  popularityRank: 42,
  trend: 'up',
  firstLetter: name.charAt(0).toUpperCase(),
  length: name.length,
  origin,
});

const NAMES: NameEntry[] = [
  entry('zoe', 'Zoé', 'f', 'grecque'),
  entry('lea', 'Léa', 'f', 'hébraïque'),
  entry('luca', 'Luca', 'm', 'latine'),
  entry('emma', 'Emma', 'f'),
  entry('noe', 'Noé', 'm'),
];

vi.mock('../../data/useNames', () => ({
  useNames: () => ({
    names: NAMES,
    byId: new Map(NAMES.map((item) => [item.id, item])),
    loading: false,
    error: null,
  }),
}));

const CODE = 'TEST-2026';

// jsdom ships no PointerEvent: a MouseEvent carrying the pointer fields is enough here.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventPolyfill as unknown as typeof PointerEvent,
    configurable: true,
    writable: true,
  });
}

const profile = (id: string, displayName: string): Profile => ({
  id,
  coupleCode: CODE,
  displayName,
  genderPreference: 'both',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const vote = (
  profileId: string,
  nameId: string,
  updatedAt: string,
  note: string | null = null,
  value: Vote['value'] = 'like',
): Vote => ({ profileId, nameId, value, note, updatedAt });

async function seed({ withPartner = true } = {}) {
  const adapter = new LocalStorageAdapter();
  await adapter.ensureCouple(CODE);
  await adapter.upsertProfile(profile('p1', 'Camille'));
  if (withPartner) await adapter.upsertProfile(profile('p2', 'Marie'));
  const votes: Vote[] = [
    vote('p1', 'lea', '2026-01-01T00:00:00.000Z'),
    vote('p1', 'zoe', '2026-01-03T00:00:00.000Z', 'Court et doux'),
    vote('p1', 'luca', '2026-01-04T00:00:00.000Z'),
    vote('p1', 'emma', '2026-01-05T00:00:00.000Z'),
    vote('p2', 'zoe', '2026-01-06T00:00:00.000Z', 'Mon préféré'),
    vote('p2', 'lea', '2026-01-07T00:00:00.000Z'),
    vote('p2', 'luca', '2026-01-08T00:00:00.000Z'),
    vote('p2', 'noe', '2026-01-09T00:00:00.000Z', 'Comme mon grand-père'),
    vote('p2', 'emma', '2026-01-10T00:00:00.000Z', null, 'skip'),
  ];
  for (const item of votes) await adapter.saveVote(CODE, item);
  return adapter;
}

function renderPage(adapter: LocalStorageAdapter, url = '/matchs') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SessionProvider adapter={adapter} initialSession={{ coupleCode: CODE, profileId: 'p1' }}>
        <MatchesPage />
      </SessionProvider>
    </MemoryRouter>,
  );
}

function rankingNames(): string[] {
  const list = screen.getByRole('list', { name: 'Classement complet' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('button', { name: /^Déplacer / }))
    .map((handle) => handle.getAttribute('aria-label')?.replace('Déplacer ', '') ?? '');
}

describe('MatchesPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the podium and the ordered ranking of common favourites', async () => {
    renderPage(await seed());
    const podium = await screen.findByRole('list', { name: 'Podium' });
    const cards = within(podium).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('Première place');
    expect(cards[0]).toHaveTextContent('Luca');
    expect(cards[0]).toHaveTextContent('Garçon');
    expect(cards[0]).toHaveTextContent('Origine latine');
    expect(cards[1]).toHaveTextContent('Zoé');
    expect(cards[2]).toHaveTextContent('Léa');

    expect(rankingNames()).toEqual(['Luca', 'Zoé', 'Léa']);
    expect(screen.getByRole('tab', { name: /Nos matchs/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /Nos matchs/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Ordre partagé avec Marie')).toBeInTheDocument();
    expect(screen.getByText('« Court et doux »')).toBeInTheDocument();
    expect(screen.getByText('Note de Marie :')).toBeInTheDocument();
    expect(screen.getByText('« Mon préféré »')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monter Luca' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descendre Léa' })).toBeDisabled();
  });

  it('persists the new order after « Descendre »', async () => {
    const adapter = await seed();
    const user = userEvent.setup();
    renderPage(adapter);
    await screen.findByRole('list', { name: 'Podium' });

    await user.click(screen.getByRole('button', { name: 'Descendre Luca' }));

    expect(rankingNames()).toEqual(['Zoé', 'Luca', 'Léa']);
    const podium = within(screen.getByRole('list', { name: 'Podium' })).getAllByRole('listitem');
    expect(podium[0]).toHaveTextContent('Zoé');
    expect((await adapter.ensureCouple(CODE)).matchOrder).toEqual(['zoe', 'luca', 'lea']);
  });

  it('moves an item with the keyboard from its handle and keeps the focus on it', async () => {
    const adapter = await seed();
    renderPage(adapter);
    await screen.findByRole('list', { name: 'Podium' });

    const handle = screen.getByRole('button', { name: 'Déplacer Léa' });
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowUp' });

    expect(rankingNames()).toEqual(['Luca', 'Léa', 'Zoé']);
    expect(screen.getByRole('button', { name: 'Déplacer Léa' })).toHaveFocus();
    expect((await adapter.ensureCouple(CODE)).matchOrder).toEqual(['luca', 'lea', 'zoe']);
  });

  it('reorders with a pointer drag on the handle', async () => {
    const adapter = await seed();
    renderPage(adapter);
    await screen.findByRole('list', { name: 'Podium' });

    // jsdom has no layout: give each row a fake 60px tall box.
    const rows = within(screen.getByRole('list', { name: 'Classement complet' })).getAllByRole(
      'listitem',
    );
    rows.forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        top: index * 60,
        bottom: index * 60 + 60,
        height: 60,
        left: 0,
        right: 300,
        width: 300,
        x: 0,
        y: index * 60,
        toJSON: () => ({}),
      });
    });

    const handle = screen.getByRole('button', { name: 'Déplacer Luca' });
    fireEvent.pointerDown(handle, { clientY: 30, pointerId: 1, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientY: 160, pointerId: 1, pointerType: 'touch' });
    expect(rows[0]).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerUp(handle, { clientY: 160, pointerId: 1, pointerType: 'touch' });

    expect(rankingNames()).toEqual(['Zoé', 'Léa', 'Luca']);
    expect((await adapter.ensureCouple(CODE)).matchOrder).toEqual(['zoe', 'lea', 'luca']);
  });

  it('removes a match with a 5 s undo window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const adapter = await seed();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderPage(adapter);
      await screen.findByRole('list', { name: 'Podium' });

      const rows = within(screen.getByRole('list', { name: 'Classement complet' })).getAllByRole(
        'listitem',
      );
      await user.click(within(rows[0]).getByRole('button', { name: 'Retirer de mes favoris' }));

      expect(rankingNames()).toEqual(['Zoé', 'Léa']);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Luca ne fait plus partie de vos favoris.',
      );

      await user.click(screen.getByRole('button', { name: 'Annuler' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(rankingNames()).toEqual(['Luca', 'Zoé', 'Léa']);

      const first = within(screen.getByRole('list', { name: 'Classement complet' })).getAllByRole(
        'listitem',
      )[0];
      await user.click(within(first).getByRole('button', { name: 'Retirer de mes favoris' }));
      expect(screen.getByRole('status')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5100);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      const votes = await adapter.listVotes(CODE);
      expect(
        votes.find((item) => item.profileId === 'p1' && item.nameId === 'luca'),
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lists my favourites newest first with match badges and a note editor', async () => {
    const adapter = await seed();
    const user = userEvent.setup();
    renderPage(adapter);
    await screen.findByRole('list', { name: 'Podium' });

    await user.click(screen.getByRole('tab', { name: 'Mes favoris' }));
    expect(screen.getByRole('tab', { name: 'Mes favoris' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const list = screen.getByRole('list', { name: 'Mes favoris' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getByText(/^(Emma|Luca|Zoé|Léa)$/).textContent)).toEqual([
      'Emma',
      'Luca',
      'Zoé',
      'Léa',
    ]);
    expect(screen.getByText('4 prénoms')).toBeInTheDocument();
    expect(within(list).getAllByText('Match')).toHaveLength(3);
    expect(within(rows[0]).queryByText('Match')).not.toBeInTheDocument();

    await user.click(within(rows[0]).getByRole('button', { name: 'Ajouter une note sur Emma' }));
    await user.type(screen.getByLabelText('Note sur Emma'), '  Prénom de ma grand-mère  ');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(within(rows[0]).getByText('« Prénom de ma grand-mère »')).toBeInTheDocument();
    const saved = (await adapter.listVotes(CODE)).find(
      (item) => item.profileId === 'p1' && item.nameId === 'emma',
    );
    expect(saved?.note).toBe('Prénom de ma grand-mère');
    expect(saved?.value).toBe('like');

    // Clearing the note stores null.
    await user.click(within(rows[0]).getByRole('button', { name: 'Modifier la note sur Emma' }));
    await user.clear(screen.getByLabelText('Note sur Emma'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const cleared = (await adapter.listVotes(CODE)).find(
      (item) => item.profileId === 'p1' && item.nameId === 'emma',
    );
    expect(cleared?.note).toBeNull();

    await user.click(within(rows[0]).getByRole('button', { name: 'Retirer' }));
    expect(screen.getByText('3 prénoms')).toBeInTheDocument();
  });

  it('shows the partner favourites and lets me like one of them', async () => {
    const adapter = await seed();
    const user = userEvent.setup();
    renderPage(adapter, '/matchs?vue=elle');

    const tab = await screen.findByRole('tab', { name: 'Favoris de Marie' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    const list = screen.getByRole('list', { name: 'Favoris de Marie' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Noé');
    expect(rows[0]).toHaveTextContent('« Comme mon grand-père »');
    expect(rows[1]).toHaveTextContent('Luca');
    expect(within(rows[1]).getByText('Match')).toBeInTheDocument();
    expect(screen.queryByText('Emma')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "J'aime aussi Noé" }));
    expect(within(rows[0]).getByText('Match')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Nos matchs/ })).toHaveTextContent('4');
    const saved = (await adapter.listVotes(CODE)).find(
      (item) => item.profileId === 'p1' && item.nameId === 'noe',
    );
    expect(saved?.value).toBe('like');
  });

  it('explains how to invite the partner when there is none', async () => {
    renderPage(await seed({ withPartner: false }), '/matchs?vue=elle');
    expect(await screen.findByRole('tab', { name: 'Ses favoris' })).toBeInTheDocument();
    expect(screen.getByText("Votre moitié n'a pas encore rejoint")).toBeInTheDocument();
    expect(screen.getByText(CODE)).toHaveClass('font-mono');
  });

  it('shows an empty state without matches and supports arrow keys on tabs', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.ensureCouple(CODE);
    await adapter.upsertProfile(profile('p1', 'Camille'));
    const user = userEvent.setup();
    renderPage(adapter);

    expect(await screen.findByText('Pas encore de match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Découvrir des prénoms' })).toBeInTheDocument();

    const first = screen.getByRole('tab', { name: /Nos matchs/ });
    first.focus();
    await user.keyboard('{ArrowRight}');
    const second = screen.getByRole('tab', { name: 'Mes favoris' });
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveFocus();
    expect(screen.getByText("Vous n'avez pas encore de favori")).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Ses favoris' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
