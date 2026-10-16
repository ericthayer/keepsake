import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect, luhn } from '../../src/core/guard.ts';

const kinds = (value: string, kind?: Parameters<typeof inspect>[1]) => inspect(value, kind).map((f) => f.kind);

test('flags Social Security numbers', () => {
  assert.deepEqual(kinds('SSN 123-45-6789'), ['ssn']);
  assert.deepEqual(kinds('123 45 6789'), ['ssn']);
});

test('flags full card numbers with a valid checksum', () => {
  assert.equal(luhn('4111111111111111'), true);
  assert.deepEqual(kinds('Visa 4111 1111 1111 1111'), ['card']);
  assert.deepEqual(kinds('4111-1111-1111-1111'), ['card']);
});

test('flags long account numbers but not phone numbers or amounts', () => {
  assert.deepEqual(kinds('Account 0012345678'), ['long-number']);
  assert.deepEqual(kinds('(555) 014-2290', 'tel'), []);
  assert.deepEqual(kinds('$1,250,000', 'currency'), []);
  assert.deepEqual(kinds('4417'), []);
});

test('flags passwords and PINs written inline', () => {
  assert.deepEqual(kinds('password: hunter2'), ['secret']);
  assert.deepEqual(kinds('PIN = 4821'), ['secret']);
  assert.deepEqual(kinds('the passcode is tulip'), ['secret']);
});

test('allows describing where a secret is kept', () => {
  assert.deepEqual(kinds('Account PIN is in the password manager'), []);
  assert.deepEqual(kinds('Password is kept in 1Password, family vault'), []);
  assert.deepEqual(kinds('Shared family vault in the password manager'), []);
});

test('empty input is clean', () => {
  assert.deepEqual(kinds('   '), []);
});
