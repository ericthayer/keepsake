// VaultStore: the single source of truth. An explicit state machine over EventTarget.
//
//   loading → setup ──create──→ unlocked(device)
//           → locked ─unlock──→ unlocked(device | copy)
//   setup ──explore──→ unlocked(demo)      unlocked ──lock──→ locked | setup
import type { Envelope, KdfParams } from './crypto.ts';
import { deriveKey, newKdfParams, seal, unseal } from './crypto.ts';
import type { EnvelopeStore } from './persistence.ts';
import { readEnvelopeFile } from './persistence.ts';
import type { Vault } from './types.ts';
import { createSampleVault } from './sample.ts';
import { createVault, markExported, parseVault } from './vault.ts';

export type Source = 'device' | 'published' | 'file';
/** device: saved in this browser. copy: opened from a file, not saved. demo: sample data. */
export type Mode = 'device' | 'copy' | 'demo';

export type VaultState =
  | { readonly status: 'loading' }
  | { readonly status: 'setup'; readonly hasDevice: boolean; readonly hasPublished: boolean }
  | {
      readonly status: 'locked';
      readonly source: Source;
      readonly hint: string;
      readonly fileName: string | null;
      readonly hasDevice: boolean;
      readonly hasPublished: boolean;
    }
  | { readonly status: 'unlocked'; readonly vault: Vault; readonly mode: Mode; readonly durable: boolean };

interface Session {
  readonly key: CryptoKey;
  readonly kdf: KdfParams;
}

interface Pending {
  readonly source: Source;
  readonly envelope: Envelope;
  readonly fileName: string | null;
}

const SAVE_DELAY_MS = 250;

export class VaultStore extends EventTarget {
  #state: VaultState = { status: 'loading' };
  #storage: EnvelopeStore;
  #device: Envelope | null = null;
  #published: Envelope | null = null;
  #pending: Pending | null = null;
  #session: Session | null = null;
  #lastEnvelope: Envelope | null = null;
  #saveTimer: ReturnType<typeof setTimeout> | null = null;
  #saves: Promise<void> = Promise.resolve();

  constructor(storage: EnvelopeStore) {
    super();
    this.#storage = storage;
  }

  get state(): VaultState {
    return this.#state;
  }

  get durable(): boolean {
    return this.#storage.durable;
  }

  subscribe(listener: (state: VaultState) => void): () => void {
    const handler = (): void => listener(this.#state);
    this.addEventListener('change', handler);
    return () => this.removeEventListener('change', handler);
  }

  #set(state: VaultState): void {
    this.#state = state;
    this.dispatchEvent(new Event('change'));
  }

  #flags(): { hasDevice: boolean; hasPublished: boolean } {
    return { hasDevice: this.#device !== null, hasPublished: this.#published !== null };
  }

  #lockedOn(pending: Pending): VaultState {
    this.#pending = pending;
    return { status: 'locked', source: pending.source, hint: pending.envelope.hint, fileName: pending.fileName, ...this.#flags() };
  }

  /** Where the app rests when nothing is open. */
  #rest(): VaultState {
    if (this.#device) return this.#lockedOn({ source: 'device', envelope: this.#device, fileName: null });
    if (this.#published) return this.#lockedOn({ source: 'published', envelope: this.#published, fileName: null });
    this.#pending = null;
    return { status: 'setup', ...this.#flags() };
  }

  async init(published: Promise<Envelope | null>): Promise<void> {
    const [device, pub] = await Promise.all([this.#storage.load().catch(() => null), published]);
    this.#device = device;
    this.#published = pub;
    this.#set(this.#rest());
  }

  showSetup(): void {
    this.#pending = null;
    this.#set({ status: 'setup', ...this.#flags() });
  }

  showLocked(source: 'device' | 'published'): void {
    const envelope = source === 'device' ? this.#device : this.#published;
    if (envelope) this.#set(this.#lockedOn({ source, envelope, fileName: null }));
  }

  async openFile(file: File): Promise<void> {
    const envelope = await readEnvelopeFile(file);
    this.#set(this.#lockedOn({ source: 'file', envelope, fileName: file.name }));
  }

  async create(ownerName: string, passphrase: string, hint: string): Promise<void> {
    const kdf = newKdfParams();
    this.#session = { key: await deriveKey(passphrase, kdf), kdf };
    const vault = createVault(ownerName, hint);
    this.#set({ status: 'unlocked', vault, mode: 'device', durable: this.durable });
    await this.#persistNow();
  }

  /** Throws WrongPassphraseError on a bad passphrase. */
  async unlock(passphrase: string): Promise<void> {
    const pending = this.#pending;
    if (!pending) throw new Error('Nothing to unlock.');
    const key = await deriveKey(passphrase, pending.envelope.kdf);
    const vault = parseVault(await unseal(pending.envelope, key));
    this.#session = { key, kdf: pending.envelope.kdf };
    this.#lastEnvelope = pending.envelope;
    const mode: Mode = pending.source === 'device' ? 'device' : 'copy';
    this.#set({ status: 'unlocked', vault, mode, durable: this.durable });
  }

  explore(): void {
    this.#session = null;
    this.#set({ status: 'unlocked', vault: createSampleVault(), mode: 'demo', durable: false });
  }

  async lock(): Promise<void> {
    // Finish the pending save first so the locked envelope is the latest one.
    await this.#flush();
    this.#session = null;
    this.#lastEnvelope = null;
    this.#set(this.#rest());
  }

  update(change: (vault: Vault) => Vault): void {
    const state = this.#state;
    if (state.status !== 'unlocked') return;
    this.#set({ ...state, vault: change(state.vault) });
    if (state.mode === 'device') this.#scheduleSave();
  }

  /** Turns an opened copy into this browser's locker. */
  async keepOnDevice(): Promise<void> {
    const state = this.#state;
    if (state.status !== 'unlocked' || state.mode !== 'copy') return;
    this.#set({ ...state, mode: 'device' });
    await this.#persistNow();
  }

  async exportFile(): Promise<{ blob: Blob; fileName: string }> {
    const state = this.#state;
    if (state.status !== 'unlocked' || !this.#session) throw new Error('Unlock the locker to download it.');
    const vault = markExported(state.vault);
    const envelope = await seal(JSON.stringify(vault), this.#session.key, this.#session.kdf, vault.settings.passphraseHint);
    this.update(() => vault);
    const date = new Date().toISOString().slice(0, 10);
    return {
      blob: new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' }),
      fileName: `life-locker-${date}.locker`,
    };
  }

  /** Throws WrongPassphraseError when `current` is wrong. */
  async changePassphrase(current: string, next: string): Promise<void> {
    const session = this.#session;
    if (!session) throw new Error('Unlock the locker first.');
    const check = this.#lastEnvelope ?? (await this.#sealCurrent());
    await unseal(check, await deriveKey(current, session.kdf));
    const kdf = newKdfParams();
    this.#session = { key: await deriveKey(next, kdf), kdf };
    const state = this.#state;
    if (state.status === 'unlocked' && state.mode === 'device') await this.#persistNow();
    else this.#lastEnvelope = await this.#sealCurrent();
  }

  async erase(): Promise<void> {
    if (this.#saveTimer) clearTimeout(this.#saveTimer);
    this.#saveTimer = null;
    await this.#saves;
    await this.#storage.clear();
    this.#device = null;
    this.#session = null;
    this.#lastEnvelope = null;
    this.showSetup();
  }

  /** Writes any debounced change now. Call on pagehide. */
  flush(): Promise<void> {
    return this.#flush();
  }

  // ── Saving ────────────────────────────────────────────────────────────────

  async #sealCurrent(): Promise<Envelope> {
    const state = this.#state;
    if (state.status !== 'unlocked' || !this.#session) throw new Error('Locker is locked.');
    return seal(JSON.stringify(state.vault), this.#session.key, this.#session.kdf, state.vault.settings.passphraseHint);
  }

  #scheduleSave(): void {
    if (this.#saveTimer) clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => void this.#flush(), SAVE_DELAY_MS);
  }

  /** Captures vault and key synchronously so a save survives an immediate lock(). */
  #flush(): Promise<void> {
    if (!this.#saveTimer) return this.#saves;
    clearTimeout(this.#saveTimer);
    this.#saveTimer = null;
    return this.#persistNow();
  }

  #persistNow(): Promise<void> {
    const state = this.#state;
    const session = this.#session;
    if (state.status !== 'unlocked' || state.mode !== 'device' || !session) return this.#saves;
    const { vault } = state;
    this.#saves = this.#saves
      .then(async () => {
        const envelope = await seal(JSON.stringify(vault), session.key, session.kdf, vault.settings.passphraseHint);
        await this.#storage.save(envelope);
        this.#device = envelope;
        this.#lastEnvelope = envelope;
      })
      .catch((error: unknown) => {
        this.dispatchEvent(new CustomEvent('save-error', { detail: error }));
      });
    return this.#saves;
  }
}
