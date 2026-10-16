// End-to-end: an owner builds a locker, downloads it, and a family member opens it elsewhere.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}/`;
const PASS = 'harbor maple seventy lantern';
let server: ChildProcess;
let browser: Browser;

before(async () => {
  server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.kill();
});

async function freshPage(): Promise<{ page: Page; errors: string[] }> {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForSelector('ll-gate');
  return { page, errors };
}

test('owner creates, edits, downloads; family opens the file and reads it', async () => {
  const { page, errors } = await freshPage();
  const gate = page.locator('ll-gate');

  await gate.locator('#gate-name').fill('Jordan Avery');
  await gate.locator('#gate-pass').fill('short');
  await gate.locator('#gate-pass2').fill('short');
  await gate.getByRole('button', { name: 'Create locker' }).click();
  await assert.doesNotReject(gate.getByText('Choose a longer passphrase').waitFor());

  await gate.locator('#gate-pass').fill(PASS);
  await gate.locator('#gate-pass2').fill(PASS);
  await gate.locator('#gate-hint').fill('Card in the fireproof box');
  await gate.getByRole('button', { name: 'Create locker' }).click();
  await page.waitForSelector('ll-shell');

  // Add an entry; the guard intercepts a pasted password before saving.
  await page.goto(`${BASE}#life-insurance`);
  await page.locator('ll-category').getByRole('button', { name: 'Add a policy' }).first().click();
  const editor = page.locator('ll-entry-editor');
  await editor.locator('#entry-title').fill('Term life policy');
  await editor.locator('#entry-institution').fill('Harborview Mutual Life');
  await editor.locator('#entry-ref').fill('4417');
  await editor.locator('#entry-notes').fill('PIN: 4821');
  await editor.locator('#entry-save').click();
  assert.equal(await editor.locator('#entry-save').textContent(), 'Save anyway');
  await editor.locator('#entry-notes').fill('Claim form is on their website.');
  await editor.locator('#entry-save').click();
  await page.locator('ll-category ll-entry').first().waitFor();
  assert.equal(await page.locator('ll-category ll-entry').count(), 1);

  // Download the encrypted backup.
  const download = page.waitForEvent('download');
  await page.locator('ll-shell').getByRole('button', { name: /Download backup/ }).click();
  const file = await download;
  assert.match(file.suggestedFilename(), /^life-locker-\d{4}-\d{2}-\d{2}\.locker$/);
  const path = join(await mkdtemp(join(tmpdir(), 'locker-')), file.suggestedFilename());
  await file.saveAs(path);

  // Family member, different browser profile: open the file, see the hint, unlock.
  const family = await freshPage();
  const familyGate = family.page.locator('ll-gate');
  const chooser = family.page.waitForEvent('filechooser');
  await familyGate.getByRole('button', { name: 'Open a .locker file' }).click();
  await (await chooser).setFiles(path);
  await familyGate.getByText('Card in the fireproof box').waitFor();
  await familyGate.locator('#gate-unlock').fill('the wrong passphrase');
  await familyGate.getByRole('button', { name: 'Unlock' }).click();
  await familyGate.getByText('doesn’t open this locker').waitFor();
  await familyGate.locator('#gate-unlock').fill(PASS);
  await familyGate.getByRole('button', { name: 'Unlock' }).click();
  await family.page.waitForSelector('ll-shell');
  await family.page.locator('ll-shell').getByText('You opened a copy').waitFor();

  await family.page.goto(`${BASE}#guide`);
  const guide = family.page.locator('ll-guide');
  await guide.getByRole('heading', { name: 'Term life policy' }).waitFor();
  await guide.getByText('Claim form is on their website.').waitFor();

  assert.deepEqual([...errors, ...family.errors], []);
});

test('sample data has no horizontal overflow at phone width', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.locator('ll-gate').getByRole('button', { name: 'Explore with sample data' }).click();
  await page.waitForSelector('ll-shell');
  for (const hash of ['overview', 'banking', 'guide', 'settings']) {
    await page.goto(`${BASE}#${hash}`);
    await page.waitForTimeout(150);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.equal(wide, 0, `#${hash} overflows by ${wide}px`);
  }
});
