import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NameEntry } from '../../data/types';
import { LocalStorageAdapter } from '../../storage/localStorageAdapter';
import { SessionProvider } from '../../store/SessionContext';
import { FILTERS_STORAGE_KEY } from './filtersStorage';
import { ListPage } from './ListPage';

const make = (name: string, partial: Partial<NameEntry> = {}): NameEntry => ({
  id: name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase(),
  name,
  gender: 'f',
  countFR: 100,
  countCH: 10,
  recentFR: 10,
  recentCH: 1,
  popularityRank: 1000,
  trend: 'stable',
  firstLetter: name[0].toUpperCase(),
  length: name.length,
  ...partial,
});

const NAMES: NameEntry[] = [
  make('Alice', { popularityRank: 1, origin: 'germanique', meaning: 'de noble lignée' }),
  make('Anaïs', { popularityRank: 2, trend: 'down' }),
  make('Arthur', { gender: 'm', popularityRank: 3, origin: 'celte' }),
  make('Camille', { gender: 'x', popularityRank: 4, origin: 'latin' }),
  make('Léa', { popularityRank: 5, origin: 'hébraïque' }),
  make('Louis', { gender: 'm', popularityRank: 6, origin: 'germanique' }),
  make('Mia', { popularityRank: 150, trend: 'up' }),
  make('Noah', { gender: 'm', popularityRank: 700 }),
  make('Zoé', { popularityRank: 2500, trend: 'up', origin: 'grec' }),
  make('Zacharie', { gender: 'm', popularityRank: 3000 }),
];

const namesState = vi.hoisted(() => ({
  current: {
    names: [] as unknown[],
    byId: new Map(),
    loading: false,
    error: null as string | null,
  },
}));

vi.mock('../../data/useNames', () => ({
  useNames: () => namesState.current,
}));

const COUPLE = 'TEST-2026';

async function seed() {
  const adapter = new LocalStorageAdapter();
  await adapter.ensureCouple(COUPLE);
  const base = { coupleCode: COUPLE, createdAt: '2026-01-01T00:00:00.000Z' };
  await adapter.upsertProfile({
    id: 'p1',
    displayName: 'Camille',
    genderPreference: 'both',
    ...base,
  });
  await adapter.upsertProfile({ id: 'p2', displayName: 'Alex', genderPreference: 'both', ...base });
  await adapter.saveVote(COUPLE, {
    profileId: 'p2',
    nameId: 'lea',
    value: 'like',
    note: null,
    updatedAt: '2026-02-01T00:00:00.000Z',
  });
  await adapter.saveVote(COUPLE, {
    profileId: 'p1',
    nameId: 'noah',
    value: 'skip',
    note: null,
    updatedAt: '2026-02-01T00:00:00.000Z',
  });
  return adapter;
}

async function renderPage(adapter: LocalStorageAdapter) {
  render(
    <MemoryRouter initialEntries={['/liste']}>
      <SessionProvider adapter={adapter} initialSession={{ coupleCode: COUPLE, profileId: 'p1' }}>
        <ListPage />
      </SessionProvider>
    </MemoryRouter>,
  );
  await screen.findByText('10 prénoms');
}

const rowNames = () =>
  screen
    .getAllByRole('button', { name: /^Aimer |^Retirer .+ de mes favoris$/ })
    .map((button) =>
      button.getAttribute('aria-label')?.replace(/^Aimer |^Retirer | de mes favoris$/g, ''),
    );

describe('ListPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    namesState.current = { names: NAMES, byId: new Map(), loading: false, error: null };
  });

  it('renders the rows, the partner hint and the skipped state', async () => {
    await renderPage(await seed());
    expect(rowNames()).toEqual(NAMES.map((entry) => entry.name));
    expect(screen.getByText('Aimé par Alex')).toBeInTheDocument();
    expect(screen.getByText('passé')).toBeInTheDocument();
    expect(screen.getByText(/Tri : Popularité/)).toBeInTheDocument();
  });

  it('filters rows while typing, ignoring accents', async () => {
    const user = userEvent.setup();
    await renderPage(await seed());
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un prénom' }), 'zo');
    await waitFor(() => expect(rowNames()).toEqual(['Zoé']));
    expect(screen.getByText('1 prénom')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
    await screen.findByText('10 prénoms');
  });

  it('shows an empty state with a reset action', async () => {
    const user = userEvent.setup();
    await renderPage(await seed());
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un prénom' }), 'xyz');
    expect(await screen.findByText('Aucun prénom ne correspond')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }));
    await screen.findByText('10 prénoms');
  });

  it('stores a like when the heart is pressed and turns it into a match', async () => {
    const user = userEvent.setup();
    const adapter = await seed();
    await renderPage(adapter);

    const heart = screen.getByRole('button', { name: 'Aimer Zoé' });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await user.click(heart);
    const pressed = await screen.findByRole('button', { name: 'Retirer Zoé de mes favoris' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    await waitFor(async () => {
      const votes = await adapter.listVotes(COUPLE);
      expect(votes).toContainEqual(
        expect.objectContaining({ profileId: 'p1', nameId: 'zoe', value: 'like' }),
      );
    });

    // Liking a name the partner already likes yields a match.
    await user.click(screen.getByRole('button', { name: 'Aimer Léa' }));
    expect(await screen.findByText('Match')).toBeInTheDocument();
    expect(screen.queryByText('Aimé par Alex')).not.toBeInTheDocument();

    // A skipped name can still be liked.
    await user.click(screen.getByRole('button', { name: 'Aimer Noah' }));
    await screen.findByRole('button', { name: 'Retirer Noah de mes favoris' });
    expect(screen.queryByText('passé')).not.toBeInTheDocument();
  });

  it('skips a name from the cross next to the heart and restores it', async () => {
    const user = userEvent.setup();
    const adapter = await seed();
    await renderPage(adapter);

    const cross = screen.getByRole('button', { name: 'Passer Zoé' });
    expect(cross).toHaveAttribute('aria-pressed', 'false');
    await user.click(cross);
    const pressed = await screen.findByRole('button', { name: 'Reprendre Zoé' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('passé')).toHaveLength(2);
    await waitFor(async () => {
      const votes = await adapter.listVotes(COUPLE);
      expect(votes).toContainEqual(
        expect.objectContaining({ profileId: 'p1', nameId: 'zoe', value: 'skip' }),
      );
    });

    // Skipping a liked name replaces the like.
    await user.click(screen.getByRole('button', { name: 'Aimer Léa' }));
    await screen.findByRole('button', { name: 'Retirer Léa de mes favoris' });
    await user.click(screen.getByRole('button', { name: 'Passer Léa' }));
    await screen.findByRole('button', { name: 'Aimer Léa' });

    // The cross of a skipped name restores it.
    await user.click(pressed);
    await screen.findByRole('button', { name: 'Passer Zoé' });
    await waitFor(async () => {
      const votes = await adapter.listVotes(COUPLE);
      expect(votes).not.toContainEqual(expect.objectContaining({ nameId: 'zoe' }));
    });
  });

  it('expands a row to show statistics and vote buttons', async () => {
    const user = userEvent.setup();
    await renderPage(await seed());
    const toggle = screen.getByRole('button', { name: /^Alice/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('de noble lignée')).toBeInTheDocument();
    expect(screen.getByText('Naissances en France')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Je passe' }));
    expect(
      await screen.findByText('passé', { selector: 'li:first-child span' }),
    ).toBeInTheDocument();
  });

  it('opens the filter dialog, narrows by letter and persists the filters', async () => {
    const user = userEvent.setup();
    await renderPage(await seed());
    await user.click(screen.getByRole('button', { name: 'Filtres' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filtres' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Lettre Z' }));
    await waitFor(() => expect(rowNames()).toEqual(['Zoé', 'Zacharie']));
    expect(within(dialog).getByRole('button', { name: 'Voir 2 prénoms' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Filtres 1/ })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Retirer le filtre Lettre Z' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}')).toMatchObject({
      letters: ['Z'],
    });

    await user.click(screen.getByRole('button', { name: 'Retirer le filtre Lettre Z' }));
    await screen.findByText('10 prénoms');
  });

  it('restores stored filters and hides genders excluded by the preference', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ genders: ['m'], sort: 'alpha', letters: ['nope'] }),
    );
    const adapter = await seed();
    await adapter.upsertProfile({
      id: 'p1',
      displayName: 'Camille',
      genderPreference: 'f',
      coupleCode: COUPLE,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    render(
      <MemoryRouter>
        <SessionProvider adapter={adapter} initialSession={{ coupleCode: COUPLE, profileId: 'p1' }}>
          <ListPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    // Preference « fille » keeps 5 girls + Camille (mixed); the stored « garçon » filter is ignored.
    await screen.findByText('6 prénoms');
    expect(screen.getByText(/Tri : Alphabétique/)).toBeInTheDocument();
    expect(rowNames()[0]).toBe('Alice');

    await user.click(screen.getByRole('button', { name: 'Filtres' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Garçon' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Fille' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tout effacer' })).toBeDisabled();
  });

  it('shows a spinner while loading and an error message on failure', async () => {
    namesState.current = { names: [], byId: new Map(), loading: true, error: null };
    const adapter = await seed();
    const { unmount } = render(
      <MemoryRouter>
        <SessionProvider adapter={adapter} initialSession={{ coupleCode: COUPLE, profileId: 'p1' }}>
          <ListPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Chargement des prénoms…');
    unmount();

    namesState.current = {
      names: [],
      byId: new Map(),
      loading: false,
      error: 'Réseau indisponible',
    };
    render(
      <MemoryRouter>
        <SessionProvider adapter={adapter} initialSession={{ coupleCode: COUPLE, profileId: 'p1' }}>
          <ListPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Réseau indisponible');
  });

  it('pages the results and reveals more on demand', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 130 }, (_, index) =>
      make(`Nom${String(index).padStart(3, '0')}`, { popularityRank: index + 1, firstLetter: 'N' }),
    );
    namesState.current = { names: many, byId: new Map(), loading: false, error: null };
    const adapter = await seed();
    render(
      <MemoryRouter>
        <SessionProvider adapter={adapter} initialSession={{ coupleCode: COUPLE, profileId: 'p1' }}>
          <ListPage />
        </SessionProvider>
      </MemoryRouter>,
    );
    await screen.findByText('130 prénoms');
    expect(rowNames()).toHaveLength(60);
    await user.click(screen.getByRole('button', { name: 'Afficher plus (70 restants)' }));
    expect(rowNames()).toHaveLength(120);
    await user.click(screen.getByRole('button', { name: 'Afficher plus (10 restants)' }));
    expect(rowNames()).toHaveLength(130);
    expect(screen.queryByRole('button', { name: /Afficher plus/ })).not.toBeInTheDocument();
  });
});
