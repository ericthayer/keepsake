// Vault model: creation, immutable updates, and validation of decrypted JSON.
import type { Entry, EntryDraft, Profile, Settings, Vault } from './types.ts';
import { isCategoryId, isPriority } from './schema.ts';

export const DEFAULT_SETTINGS: Settings = { autoLockMinutes: 10, passphraseHint: '' };
export const AUTO_LOCK_CHOICES = [5, 10, 15, 30, 60] as const;

const now = (): string => new Date().toISOString();

export function newId(): string {
  return crypto.randomUUID();
}

export function createVault(ownerName: string, passphraseHint = ''): Vault {
  const stamp = now();
  return {
    version: 1,
    profile: { ownerName: ownerName.trim(), letter: '' },
    settings: { ...DEFAULT_SETTINGS, passphraseHint: passphraseHint.trim() },
    entries: [],
    createdAt: stamp,
    updatedAt: stamp,
    lastExportedAt: null,
  };
}

function clean(fields: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function upsertEntry(vault: Vault, draft: EntryDraft): { vault: Vault; entry: Entry } {
  const stamp = now();
  const existing = draft.id ? vault.entries.find((e) => e.id === draft.id) : undefined;
  const entry: Entry = {
    id: existing?.id ?? newId(),
    category: draft.category,
    title: draft.title.trim(),
    priority: draft.priority,
    fields: clean(draft.fields),
    notes: draft.notes.trim(),
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  const entries = existing
    ? vault.entries.map((e) => (e.id === entry.id ? entry : e))
    : [...vault.entries, entry];
  return { vault: { ...vault, entries, updatedAt: stamp }, entry };
}

export function removeEntry(vault: Vault, id: string): Vault {
  return { ...vault, entries: vault.entries.filter((e) => e.id !== id), updatedAt: now() };
}

export function updateProfile(vault: Vault, patch: Partial<Profile>): Vault {
  return { ...vault, profile: { ...vault.profile, ...patch }, updatedAt: now() };
}

export function updateSettings(vault: Vault, patch: Partial<Settings>): Vault {
  return { ...vault, settings: { ...vault.settings, ...patch }, updatedAt: now() };
}

export function markExported(vault: Vault): Vault {
  // Exporting does not change content, so updatedAt stays put; the backup is current.
  return { ...vault, lastExportedAt: now() };
}

export function isBackupStale(vault: Vault): boolean {
  return vault.lastExportedAt === null || vault.lastExportedAt < vault.updatedAt;
}

export function entriesIn(vault: Vault, category: Entry['category']): Entry[] {
  return vault.entries
    .filter((e) => e.category === category)
    .sort((a, b) => a.title.localeCompare(b.title));
}

// ── Validation of decrypted JSON ─────────────────────────────────────────────

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function parseFields(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') out[key] = value;
  return out;
}

function parseEntry(raw: unknown): Entry | null {
  if (!isRecord(raw) || !isCategoryId(raw['category'])) return null;
  const stamp = now();
  return {
    id: str(raw['id']) || newId(),
    category: raw['category'],
    title: str(raw['title'], 'Untitled'),
    priority: isPriority(raw['priority']) ? raw['priority'] : 'when-ready',
    fields: parseFields(raw['fields']),
    notes: str(raw['notes']),
    createdAt: str(raw['createdAt'], stamp),
    updatedAt: str(raw['updatedAt'], stamp),
  };
}

export function parseVault(json: string): Vault {
  const raw: unknown = JSON.parse(json);
  if (!isRecord(raw) || raw['version'] !== 1) throw new Error('Unsupported locker version.');
  const profile = isRecord(raw['profile']) ? raw['profile'] : {};
  const settings = isRecord(raw['settings']) ? raw['settings'] : {};
  const minutes = settings['autoLockMinutes'];
  const entries = Array.isArray(raw['entries']) ? raw['entries'] : [];
  const stamp = now();
  return {
    version: 1,
    profile: { ownerName: str(profile['ownerName']), letter: str(profile['letter']) },
    settings: {
      autoLockMinutes:
        typeof minutes === 'number' && minutes >= 1 && minutes <= 240 ? minutes : DEFAULT_SETTINGS.autoLockMinutes,
      passphraseHint: str(settings['passphraseHint']),
    },
    entries: entries.map(parseEntry).filter((e): e is Entry => e !== null),
    createdAt: str(raw['createdAt'], stamp),
    updatedAt: str(raw['updatedAt'], stamp),
    lastExportedAt: typeof raw['lastExportedAt'] === 'string' ? raw['lastExportedAt'] : null,
  };
}
