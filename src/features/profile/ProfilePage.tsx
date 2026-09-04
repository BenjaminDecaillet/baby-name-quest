import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { GENDER_PREFERENCE_LABELS, type GenderPreference } from '../../data/types';
import { useSession } from '../../store/SessionContext';
import { useVotes } from '../../store/useVotes';

const PREFERENCES: GenderPreference[] = ['f', 'm', 'both'];

export function ProfilePage() {
  const { profile, partner, couple, storageKind, updatePreference, switchProfile, leaveCouple } =
    useSession();
  const { myLikes, theirLikes, matches, mine } = useVotes();
  if (!profile) return null;

  return (
    <section className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-extrabold text-stone-800">Mon profil</h1>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Code de couple
        </p>
        <p className="mt-1 font-mono text-lg font-bold text-rose-600">{couple?.code}</p>
        <p className="mt-3 text-sm text-stone-600">
          Vous êtes <strong>{profile.displayName}</strong>
          {partner ? (
            <>
              {' '}
              et votre moitié est <strong>{partner.displayName}</strong>.
            </>
          ) : (
            <>. Votre moitié n'a pas encore créé son profil avec ce code.</>
          )}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-700">Vous cherchez un prénom pour…</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PREFERENCES.map((option) => (
            <Chip
              key={option}
              selected={profile.genderPreference === option}
              onClick={() => void updatePreference(option)}
            >
              {GENDER_PREFERENCE_LABELS[option]}
            </Chip>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Mes favoris" value={myLikes.length} />
        <Stat
          label={partner ? `Favoris de ${partner.displayName}` : 'Ses favoris'}
          value={theirLikes.length}
        />
        <Stat label="En commun" value={matches.length} />
      </dl>
      <p className="text-center text-xs text-stone-500">
        {mine.size} prénom{mine.size > 1 ? 's' : ''} déjà passé{mine.size > 1 ? 's' : ''} en revue.
      </p>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-700">Synchronisation</h2>
        <p className="mt-1 text-sm text-stone-600">
          {storageKind === 'supabase'
            ? 'Vos choix sont synchronisés entre vos appareils en temps réel.'
            : "Mode local : vos choix restent sur cet appareil. La synchronisation s'active dès que le site est configuré avec Supabase."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={switchProfile}>
          Changer de profil
        </Button>
        <Button variant="danger" onClick={leaveCouple}>
          Changer de code de couple
        </Button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-2xl font-extrabold text-stone-800">{value}</dd>
    </div>
  );
}
