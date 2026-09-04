/** What this device remembers between visits: which couple and which profile. */
export interface DeviceSession {
  coupleCode: string | null;
  profileId: string | null;
}

const KEY = 'bnq.session';

export function readDeviceSession(storage: Storage = window.localStorage): DeviceSession {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { coupleCode: null, profileId: null };
    const parsed = JSON.parse(raw) as Partial<DeviceSession>;
    return { coupleCode: parsed.coupleCode ?? null, profileId: parsed.profileId ?? null };
  } catch {
    return { coupleCode: null, profileId: null };
  }
}

export function writeDeviceSession(
  session: DeviceSession,
  storage: Storage = window.localStorage,
): void {
  try {
    storage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode or full storage: the session simply will not survive a reload.
  }
}
