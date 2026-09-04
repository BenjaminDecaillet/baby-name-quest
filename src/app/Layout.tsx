import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../store/SessionContext';
import { useVotes } from '../store/useVotes';

const TABS = [
  { to: '/swipe', label: 'Découvrir', icon: '🃏' },
  { to: '/liste', label: 'Liste', icon: '📋' },
  { to: '/matchs', label: 'Nos matchs', icon: '💞' },
] as const;

export function Layout() {
  const { profile, partner, storageKind } = useSession();
  const { matches } = useVotes();

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <header className="z-20 shrink-0 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
          <NavLink to="/swipe" className="flex items-center gap-2 font-extrabold text-rose-600">
            <span aria-hidden="true">👶</span>
            <span>Baby Name Quest</span>
          </NavLink>
          <NavLink
            to="/profil"
            className="flex min-h-10 items-center gap-2 rounded-full bg-stone-100 py-1 pr-3 pl-1 text-sm font-semibold text-stone-700 hover:bg-stone-200"
            aria-label="Mon profil"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white"
              aria-hidden="true"
            >
              {profile?.displayName.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-24 truncate">{profile?.displayName}</span>
            {storageKind === 'local' ? (
              <span className="sr-only">Mode local, sans synchronisation</span>
            ) : null}
          </NavLink>
        </div>
        {!partner ? (
          <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
            En attente de votre moitié · code{' '}
            <span className="font-mono">{profile?.coupleCode}</span>
          </p>
        ) : null}
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition ${
                    isActive ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                <span className="text-2xl" aria-hidden="true">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.to === '/matchs' && matches.length > 0 ? (
                  <span className="absolute top-2 right-[calc(50%-1.75rem)] rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                    {matches.length}
                    <span className="sr-only"> prénoms en commun</span>
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
