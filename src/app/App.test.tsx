import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('walks through the onboarding and lands on the swipe view', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Baby Name Quest' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Code de couple'), 'dupont 2026');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(await screen.findByText('Code DUPONT-2026')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Votre prénom'), 'Camille');
    await user.click(screen.getByRole('button', { name: 'Une fille' }));
    await user.click(screen.getByRole('button', { name: "C'est parti !" }));

    expect(
      await screen.findByRole('navigation', { name: 'Navigation principale' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveTextContent('Camille');
  });
});
