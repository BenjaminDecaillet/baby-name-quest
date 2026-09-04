import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';
import { ListPage } from '../features/list/ListPage';
import { MatchesPage } from '../features/matches/MatchesPage';
import { Onboarding } from '../features/onboarding/Onboarding';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SwipePage } from '../features/swipe/SwipePage';
import { SessionProvider, useSession } from '../store/SessionContext';
import { Layout } from './Layout';

function Gate() {
  const { status } = useSession();
  if (status === 'loading') return <Spinner />;
  if (status !== 'ready') return <Onboarding />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/swipe" replace />} />
        <Route path="/swipe" element={<SwipePage />} />
        <Route path="/liste" element={<ListPage />} />
        <Route path="/matchs" element={<MatchesPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/swipe" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </BrowserRouter>
  );
}
