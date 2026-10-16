import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveKey,
  fromBase64,
  InvalidLockerFileError,
  newKdfParams,
  parseEnvelope,
  passphraseStrength,
  seal,
  toBase64,
  unseal,
  WrongPassphraseError,
} from '../../src/core/crypto.ts';

const fastKdf = () => ({ ...newKdfParams(), iterations: 100_000 });

test('seal then unseal round-trips with the right passphrase', async () => {
  const kdf = fastKdf();
  const key = await deriveKey('harbor maple seventy lantern', kdf);
  const envelope = await seal('{"hello":"family"}', key, kdf, 'In the blue folder');
  assert.equal(envelope.hint, 'In the blue folder');
  assert.ok(!envelope.data.includes('family'));
  const again = await deriveKey('harbor maple seventy lantern', kdf);
  assert.equal(await unseal(envelope, again), '{"hello":"family"}');
});

test('wrong passphrase raises WrongPassphraseError', async () => {
  const kdf = fastKdf();
  const envelope = await seal('secret', await deriveKey('right passphrase here', kdf), kdf, '');
  await assert.rejects(unseal(envelope, await deriveKey('wrong passphrase here', kdf)), WrongPassphraseError);
});

test('tampered ciphertext is rejected', async () => {
  const kdf = fastKdf();
  const key = await deriveKey('right passphrase here', kdf);
  const envelope = await seal('secret data', key, kdf, '');
  const bytes = fromBase64(envelope.data);
  bytes[0] = (bytes[0] ?? 0) ^ 0xff;
  await assert.rejects(unseal({ ...envelope, data: toBase64(bytes) }, key), WrongPassphraseError);
});

test('each seal uses a fresh IV', async () => {
  const kdf = fastKdf();
  const key = await deriveKey('right passphrase here', kdf);
  const a = await seal('same', key, kdf, '');
  const b = await seal('same', key, kdf, '');
  assert.notEqual(a.cipher.iv, b.cipher.iv);
  assert.notEqual(a.data, b.data);
});

test('parseEnvelope validates untrusted input', async () => {
  const kdf = fastKdf();
  const good = await seal('x', await deriveKey('right passphrase here', kdf), kdf, 'hint');
  assert.deepEqual(parseEnvelope(JSON.parse(JSON.stringify(good))), good);
  assert.throws(() => parseEnvelope({}), InvalidLockerFileError);
  assert.throws(() => parseEnvelope({ ...good, v: 2 }), InvalidLockerFileError);
  assert.throws(() => parseEnvelope({ ...good, kdf: { ...good.kdf, iterations: 1e9 } }), InvalidLockerFileError);
  assert.throws(() => parseEnvelope({ ...good, kdf: { ...good.kdf, iterations: 10 } }), InvalidLockerFileError);
  assert.equal(parseEnvelope({ ...good, hint: 'x'.repeat(1000) }).hint.length, 280);
});

test('base64 round-trips large buffers', () => {
  const bytes = new Uint8Array(200_000).map((_, i) => i % 251);
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});

test('passphrase strength rejects short and low-variety input', () => {
  assert.equal(passphraseStrength('short').acceptable, false);
  assert.equal(passphraseStrength('aaaaaaaaaaaaaaaa').acceptable, false);
  assert.equal(passphraseStrength('harbor maple seventy lantern').acceptable, true);
  assert.equal(passphraseStrength('harbor maple seventy lantern').label, 'Strong');
});
