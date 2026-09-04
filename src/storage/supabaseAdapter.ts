import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { GenderPreference } from '../data/types';
import {
  nowIso,
  type Couple,
  type Profile,
  type StorageAdapter,
  type Vote,
  type VoteValue,
} from './types';

/** Header read by the row level security policies (see supabase/schema.sql). */
export const COUPLE_CODE_HEADER = 'x-couple-code';

interface CoupleRow {
  code: string;
  created_at: string;
  match_order: string[] | null;
}

interface ProfileRow {
  id: string;
  couple_code: string;
  display_name: string;
  gender_preference: GenderPreference;
  created_at: string;
}

interface VoteRow {
  couple_code: string;
  profile_id: string;
  name_id: string;
  value: VoteValue;
  note: string | null;
  updated_at: string;
}

const toCouple = (row: CoupleRow): Couple => ({
  code: row.code,
  createdAt: row.created_at,
  matchOrder: row.match_order ?? [],
});

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  coupleCode: row.couple_code,
  displayName: row.display_name,
  genderPreference: row.gender_preference,
  createdAt: row.created_at,
});

const toVote = (row: VoteRow): Vote => ({
  profileId: row.profile_id,
  nameId: row.name_id,
  value: row.value,
  note: row.note,
  updatedAt: row.updated_at,
});

/**
 * Supabase implementation. Every request carries the couple code in a header
 * that the RLS policies compare with the rows' `couple_code`, so a device only
 * ever sees the data of the couple whose code it knows. Devices notify each
 * other through a broadcast channel named after the couple code.
 */
export class SupabaseAdapter implements StorageAdapter {
  readonly kind = 'supabase' as const;
  private readonly clients = new Map<string, SupabaseClient>();
  private readonly channels = new Map<string, RealtimeChannel>();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
  ) {}

  private client(coupleCode: string): SupabaseClient {
    let client = this.clients.get(coupleCode);
    if (!client) {
      client = createClient(this.url, this.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { [COUPLE_CODE_HEADER]: coupleCode } },
      });
      this.clients.set(coupleCode, client);
    }
    return client;
  }

  private channel(coupleCode: string): RealtimeChannel {
    let channel = this.channels.get(coupleCode);
    if (!channel) {
      channel = this.client(coupleCode)
        .channel(`couple:${coupleCode}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'changed' }, () => {
          this.listeners.get(coupleCode)?.forEach((listener) => listener());
        });
      channel.subscribe();
      this.channels.set(coupleCode, channel);
    }
    return channel;
  }

  private async notify(coupleCode: string): Promise<void> {
    try {
      await this.channel(coupleCode).send({ type: 'broadcast', event: 'changed', payload: {} });
    } catch {
      // Realtime is best effort: the other device will refresh on focus anyway.
    }
  }

  async ensureCouple(code: string): Promise<Couple> {
    const client = this.client(code);
    const existing = await client
      .from('couples')
      .select('*')
      .eq('code', code)
      .maybeSingle<CoupleRow>();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return toCouple(existing.data);
    const inserted = await client
      .from('couples')
      .upsert({ code, created_at: nowIso(), match_order: [] }, { onConflict: 'code' })
      .select('*')
      .single<CoupleRow>();
    if (inserted.error) throw new Error(inserted.error.message);
    return toCouple(inserted.data);
  }

  async listProfiles(coupleCode: string): Promise<Profile[]> {
    const { data, error } = await this.client(coupleCode)
      .from('profiles')
      .select('*')
      .eq('couple_code', coupleCode)
      .order('created_at', { ascending: true })
      .returns<ProfileRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProfile);
  }

  async upsertProfile(profile: Profile): Promise<Profile> {
    const row: ProfileRow = {
      id: profile.id,
      couple_code: profile.coupleCode,
      display_name: profile.displayName,
      gender_preference: profile.genderPreference,
      created_at: profile.createdAt,
    };
    const { error } = await this.client(profile.coupleCode)
      .from('profiles')
      .upsert(row, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    void this.notify(profile.coupleCode);
    return profile;
  }

  async listVotes(coupleCode: string): Promise<Vote[]> {
    const { data, error } = await this.client(coupleCode)
      .from('votes')
      .select('*')
      .eq('couple_code', coupleCode)
      .returns<VoteRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toVote);
  }

  async saveVote(coupleCode: string, vote: Vote): Promise<void> {
    const row: VoteRow = {
      couple_code: coupleCode,
      profile_id: vote.profileId,
      name_id: vote.nameId,
      value: vote.value,
      note: vote.note,
      updated_at: vote.updatedAt,
    };
    const { error } = await this.client(coupleCode)
      .from('votes')
      .upsert(row, { onConflict: 'profile_id,name_id' });
    if (error) throw new Error(error.message);
    void this.notify(coupleCode);
  }

  async deleteVote(coupleCode: string, profileId: string, nameId: string): Promise<void> {
    const { error } = await this.client(coupleCode)
      .from('votes')
      .delete()
      .eq('profile_id', profileId)
      .eq('name_id', nameId);
    if (error) throw new Error(error.message);
    void this.notify(coupleCode);
  }

  async saveMatchOrder(coupleCode: string, nameIds: string[]): Promise<void> {
    const { error } = await this.client(coupleCode)
      .from('couples')
      .update({ match_order: nameIds })
      .eq('code', coupleCode);
    if (error) throw new Error(error.message);
    void this.notify(coupleCode);
  }

  subscribe(coupleCode: string, onChange: () => void): () => void {
    const set = this.listeners.get(coupleCode) ?? new Set();
    set.add(onChange);
    this.listeners.set(coupleCode, set);
    this.channel(coupleCode);
    // Safety net when a broadcast is missed (background tab, flaky network).
    const onVisible = () => {
      if (document.visibilityState === 'visible') onChange();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      set.delete(onChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }
}
