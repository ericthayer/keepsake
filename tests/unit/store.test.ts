import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Envelope } from '../../src/core/crypto.ts';
import { WrongPassphraseError } from '../../src/core/crypto.ts';
import type { EnvelopeStore } from '../../src/core/persistence.ts';
import { VaultStore } from '../../src/core/store.ts';
import { upsertEntry } from '../../src/core/vault.ts';

class FakeStorage implements EnvelopeStore {
  readonly durable = true;
  value: Envelope | null = null;
  async load() { return this.value; }
  async save(e: Envelope) { this.value = e; }
  async clear() { this.value = null; }
}

const PASS = 'harbor maple seventy lantern';

test('create → edit → lock → unlock restores the latest edit', async () => {
  const storage = new FakeStorage();
  const store = new VaultStore(storage);
  await store.init(Promise.resolve(null));
  assert.equal(store.state.status, 'setup');

  await store.create('Jordan', PASS, 'Blue folder');
  store.update((v) => upsertEntry(v, { category: 'banking', title: 'Checking', priority: 'first-week', fields: {}, notes: '' }).vault);
  await store.lock(); // must flush the debounced save
  assert.equal(store.state.status, 'locked');
  assert.equal(store.state.status === 'locked' && store.state.hint, 'Blue folder');

  await assert.rejects(store.unlock('not the passphrase'), WrongPassphraseError);
  await store.unlock(PASS);
  const state = store.state;
  assert.equal(state.status, 'unlocked');
  assert.equal(state.status === 'unlocked' && state.vault.entries.length, 1);
  assert.equal(state.status === 'unlocked' && state.mode, 'device');
});

test('a published copy opens read-only until kept', async () => {
  const author = new VaultStore(new FakeStorage());
  await author.init(Promise.resolve(null));
  await author.create('Jordan', PASS, '');
  const { blob } = await author.exportFile();
  const published = JSON.parse(await blob.text()) as Envelope;

  const family = new FakeStorage();
  const store = new VaultStore(family);
  await store.init(Promise.resolve(published));
  assert.equal(store.state.status === 'locked' && store.state.source, 'published');
  await store.unlock(PASS);
  assert.equal(store.state.status === 'unlocked' && store.state.mode, 'copy');
  store.update((v) => ({ ...v, profile: { ...v.profile, letter: 'hi' } }));
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(family.value, null, 'copies are not saved implicitly');
  await store.keepOnDevice();
  assert.notEqual(family.value, null);
});

test('changePassphrase requires the current one and re-keys', async () => {
  const storage = new FakeStorage();
  const store = new VaultStore(storage);
  await store.init(Promise.resolve(null));
  await store.create('Jordan', PASS, '');
  await assert.rejects(store.changePassphrase('wrong wrong wrong', 'new passphrase entirely'), WrongPassphraseError);
  await store.changePassphrase(PASS, 'new passphrase entirely');
  await store.lock();
  await assert.rejects(store.unlock(PASS), WrongPassphraseError);
  await store.unlock('new passphrase entirely');
  assert.equal(store.state.status, 'unlocked');
});

test('erase clears the device and returns to setup', async () => {
  const storage = new FakeStorage();
  const store = new VaultStore(storage);
  await store.init(Promise.resolve(null));
  await store.create('Jordan', PASS, '');
  await store.erase();
  assert.equal(storage.value, null);
  assert.equal(store.state.status, 'setup');
});
