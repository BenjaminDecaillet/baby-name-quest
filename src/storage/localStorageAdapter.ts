import { nowIso, type Couple, type Profile, type StorageAdapter, type Vote } from './types';

interface CoupleRecord {
  couple: Couple;
  profiles: Profile[];
  votes: Vote[];
}

const PREFIX = 'bnq.couple.';

function storageKey(code: string): string {
  return `${PREFIX}${code}`;
}

/**
 * Fallback adapter keeping everything in the browser. Both profiles of the
 * couple live on the same device, which is enough to try the application
 * without any backend. Cross-tab updates are propagated through the
 * `storage` event.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = 'local' as const;
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(private readonly storage: Storage = window.localStorage) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith(PREFIX)) {
          const code = event.key.slice(PREFIX.length);
          this.listeners.get(code)?.forEach((listener) => listener());
        }
      });
    }
  }

  private read(code: string): CoupleRecord | null {
    try {
      const raw = this.storage.getItem(storageKey(code));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CoupleRecord>;
      return {
        couple: { code, createdAt: nowIso(), matchOrder: [], ...parsed.couple },
        profiles: parsed.profiles ?? [],
        votes: parsed.votes ?? [],
      };
    } catch {
      return null;
    }
  }

  private write(code: string, record: CoupleRecord): void {
    this.storage.setItem(storageKey(code), JSON.stringify(record));
  }

  async ensureCouple(code: string): Promise<Couple> {
    const existing = this.read(code);
    if (existing) return existing.couple;
    const record: CoupleRecord = {
      couple: { code, createdAt: nowIso(), matchOrder: [] },
      profiles: [],
      votes: [],
    };
    this.write(code, record);
    return record.couple;
  }

  async listProfiles(coupleCode: string): Promise<Profile[]> {
    return this.read(coupleCode)?.profiles ?? [];
  }

  async upsertProfile(profile: Profile): Promise<Profile> {
    const record = this.read(profile.coupleCode) ?? {
      couple: await this.ensureCouple(profile.coupleCode),
      profiles: [],
      votes: [],
    };
    const index = record.profiles.findIndex((item) => item.id === profile.id);
    if (index >= 0) record.profiles[index] = profile;
    else record.profiles.push(profile);
    this.write(profile.coupleCode, record);
    return profile;
  }

  async listVotes(coupleCode: string): Promise<Vote[]> {
    return this.read(coupleCode)?.votes ?? [];
  }

  async saveVote(coupleCode: string, vote: Vote): Promise<void> {
    const record = this.read(coupleCode);
    if (!record) return;
    const index = record.votes.findIndex(
      (item) => item.profileId === vote.profileId && item.nameId === vote.nameId,
    );
    if (index >= 0) record.votes[index] = vote;
    else record.votes.push(vote);
    this.write(coupleCode, record);
  }

  async deleteVote(coupleCode: string, profileId: string, nameId: string): Promise<void> {
    const record = this.read(coupleCode);
    if (!record) return;
    record.votes = record.votes.filter(
      (item) => !(item.profileId === profileId && item.nameId === nameId),
    );
    this.write(coupleCode, record);
  }

  async saveMatchOrder(coupleCode: string, nameIds: string[]): Promise<void> {
    const record = this.read(coupleCode);
    if (!record) return;
    record.couple.matchOrder = nameIds;
    this.write(coupleCode, record);
  }

  subscribe(coupleCode: string, onChange: () => void): () => void {
    const set = this.listeners.get(coupleCode) ?? new Set();
    set.add(onChange);
    this.listeners.set(coupleCode, set);
    return () => {
      set.delete(onChange);
    };
  }
}
