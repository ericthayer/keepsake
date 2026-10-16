import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVault,
  entriesIn,
  isBackupStale,
  markExported,
  parseVault,
  removeEntry,
  upsertEntry,
} from '../../src/core/vault.ts';
import { assessReadiness } from '../../src/core/readiness.ts';
import { createSampleVault } from '../../src/core/sample.ts';
import { parseRoute, routeHref } from '../../src/core/router.ts';
import { CATEGORIES } from '../../src/core/schema.ts';
import { CATEGORY_IDS } from '../../src/core/types.ts';
import { inspect } from '../../src/core/guard.ts';

const draft = { category: 'banking', title: ' Checking ', priority: 'first-week', fields: { ref: '0932', phone: ' ' }, notes: '' } as const;

test('upsert creates, then updates in place', () => {
  const v0 = createVault('Jordan');
  const { vault: v1, entry } = upsertEntry(v0, draft);
  assert.equal(entry.title, 'Checking');
  assert.deepEqual(entry.fields, { ref: '0932' }, 'blank fields are dropped');
  const { vault: v2 } = upsertEntry(v1, { ...draft, id: entry.id, title: 'Joint checking' });
  assert.equal(v2.entries.length, 1);
  assert.equal(v2.entries[0]?.title, 'Joint checking');
  assert.equal(v2.entries[0]?.createdAt, entry.createdAt);
  assert.equal(removeEntry(v2, entry.id).entries.length, 0);
});

test('backup goes stale after an edit', () => {
  const exported = markExported(upsertEntry(createVault('J'), draft).vault);
  assert.equal(isBackupStale(exported), false);
  assert.equal(isBackupStale({ ...exported, updatedAt: new Date(Date.now() + 1000).toISOString() }), true);
});

test('parseVault survives a JSON round-trip and drops unknown categories', () => {
  const sample = createSampleVault();
  assert.deepEqual(parseVault(JSON.stringify(sample)), sample);
  const tampered = JSON.stringify({ ...sample, entries: [...sample.entries, { category: 'nope' }] });
  assert.equal(parseVault(tampered).entries.length, sample.entries.length);
  assert.throws(() => parseVault('{"version":9}'));
});

test('readiness reflects the sample locker', () => {
  const items = assessReadiness(createSampleVault());
  const done = Object.fromEntries(items.map((i) => [i.id, i.done]));
  assert.equal(done['will'], true);
  assert.equal(done['executor'], true);
  assert.equal(done['phone-email'], true);
  assert.equal(done['backup'], false);
  assert.equal(assessReadiness(createVault('J')).filter((i) => i.done).length, 0);
});

test('entriesIn sorts by title within a category', () => {
  const titles = entriesIn(createSampleVault(), 'contacts').map((e) => e.title);
  assert.deepEqual(titles, ['Dana Okafor', 'Sam Avery']);
});

test('routes round-trip as bare tokens', () => {
  for (const id of CATEGORY_IDS) assert.deepEqual(parseRoute(routeHref({ name: 'category', id })), { name: 'category', id });
  assert.deepEqual(parseRoute('#guide'), { name: 'guide' });
  assert.deepEqual(parseRoute('#nonsense'), { name: 'overview' });
});

test('every category has unique field keys', () => {
  assert.equal(CATEGORIES.length, CATEGORY_IDS.length);
  for (const c of CATEGORIES) {
    const keys = c.fields.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, c.id);
  }
});

test('sample data passes the sensitive-data guard', () => {
  for (const e of createSampleVault().entries) {
    const def = CATEGORIES.find((c) => c.id === e.category);
    for (const [key, value] of Object.entries(e.fields)) {
      const field = def?.fields.find((f) => f.key === key);
      const kind = field && field.kind !== 'select' ? field.kind : 'text';
      assert.deepEqual(inspect(value, kind), [], `${e.title}.${key}`);
    }
    assert.deepEqual(inspect(e.notes), [], `${e.title}.notes`);
  }
});
