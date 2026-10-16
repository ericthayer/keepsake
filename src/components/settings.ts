// <ll-settings>: letter, passphrase, auto-lock, backup and sharing, and erase.
import { passphraseStrength, WrongPassphraseError } from '../core/crypto.ts';
import type { Mode } from '../core/store.ts';
import type { Vault } from '../core/types.ts';
import { AUTO_LOCK_CHOICES, isBackupStale, updateProfile, updateSettings } from '../core/vault.ts';
import { css } from '../styles/css.ts';
import { viewStyles } from '../styles/view.ts';
import { dispatchCommand } from '../ui/commands.ts';
import { store } from '../ui/context.ts';
import { h } from '../ui/dom.ts';
import { formatDate } from '../ui/format.ts';
import { icon } from '../ui/icons.ts';
import { pageHead, VaultView } from '../ui/view.ts';
import { confirmAction } from './confirm.ts';
import { passphraseField, passphraseStyles } from './passphrase-field.ts';
import { announce } from './toast.ts';

const styles = css`
  section { padding-top: var(--space-4); border-top: 2px solid var(--ink); }
  section > p { color: var(--ink-2); }
  form { display: grid; gap: var(--space-4); max-width: 40rem; }
  form .btn { justify-self: start; }
  textarea#set-letter { min-height: 12rem; font-size: var(--step-0); }
  .ways { margin: 0; padding-left: 1.25em; display: grid; gap: var(--space-2); max-width: var(--measure); }
  .ways code { font-family: var(--font-mono); background: var(--paper); padding: 0 0.3em; border-radius: var(--radius-1); }
  .status { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .danger { border-top-color: var(--danger); }
  .inline-select { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
  .inline-select select { width: auto; }
`;

export class SettingsElement extends VaultView {
  constructor() {
    super(viewStyles, passphraseStyles, styles);
  }

  protected renderVault(vault: Vault, mode: Mode): Node {
    return h(
      'div',
      { class: 'view' },
      pageHead('Settings', 'Locker settings', h('p', { class: 'muted' }, 'Your letter, your passphrase, and how your family gets a copy.')),
      this.#about(vault),
      mode === 'demo' ? null : this.#backup(vault, mode),
      mode === 'demo' ? null : this.#security(vault),
      mode === 'device' ? this.#erase() : null,
    );
  }

  #about(vault: Vault): HTMLElement {
    const name = h('input', { id: 'set-name', name: 'name', 'data-focus': 'set-name', value: vault.profile.ownerName, autocomplete: 'name' });
    const letter = h('textarea', { id: 'set-letter', name: 'letter', 'data-focus': 'set-letter', 'aria-describedby': 'set-letter-hint' }, vault.profile.letter);
    const form = h(
      'form',
      {
        on: {
          submit: (e) => {
            e.preventDefault();
            store.update((v) => updateProfile(v, { ownerName: name.value.trim(), letter: letter.value.trim() }));
            announce('Letter saved');
          },
        },
      },
      h('div', { class: 'field' }, h('label', { for: 'set-name' }, 'Your name'), name),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'set-letter' }, 'Letter to your family'),
        letter,
        h('p', { class: 'hint', id: 'set-letter-hint' }, 'Shown first in the family guide. Who to call, what matters, what can wait. Leave a blank line between paragraphs.'),
      ),
      h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save letter'),
    );
    return h('section', { 'aria-labelledby': 'about-title' }, h('h2', { id: 'about-title' }, 'Your letter'), form);
  }

  #backup(vault: Vault, mode: Mode): HTMLElement {
    const stale = isBackupStale(vault);
    return h(
      'section',
      { 'aria-labelledby': 'backup-title' },
      h('h2', { id: 'backup-title' }, 'Backup and sharing'),
      h('p', null, 'Your family can’t open this browser. They open a .locker file with the passphrase. Download a new one after changes.'),
      h(
        'p',
        { class: 'status' },
        h('span', { class: stale ? 'chip chip-first-week' : 'chip chip-ok' }, stale ? 'Out of date' : 'Current'),
        `Last downloaded ${formatDate(vault.lastExportedAt)}`,
      ),
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-primary', on: { click: () => dispatchCommand(this, { type: 'export' }) } }, icon('download'), 'Download .locker file'),
        mode === 'copy'
          ? h('button', { type: 'button', class: 'btn', on: { click: () => void this.#keep() } }, icon('lock'), 'Keep on this device')
          : null,
      ),
      h('h3', null, 'Ways to get it to your family'),
      h(
        'ul',
        { class: 'ways' },
        h('li', null, 'Save it to a USB drive kept with your will, or give a copy to your executor or attorney.'),
        h('li', null, 'Publish it with this site: rename it to ', h('code', null, 'vault.locker'), ' and put it next to index.html. Family visits the site and enters the passphrase.'),
        h('li', null, 'Print the family guide as a paper backup. It contains no passwords, but store it like any financial record.'),
      ),
    );
  }

  #security(vault: Vault): HTMLElement {
    const hint = h('input', { id: 'set-hint', 'data-focus': 'set-hint', value: vault.settings.passphraseHint, maxlength: '280', 'aria-describedby': 'set-hint-help' });
    const minutes = h(
      'select',
      {
        id: 'set-autolock',
        'data-focus': 'set-autolock',
        on: {
          change: () => {
            store.update((v) => updateSettings(v, { autoLockMinutes: Number(minutes.value) }));
            announce(`Locks after ${minutes.value} minutes idle`);
          },
        },
      },
      AUTO_LOCK_CHOICES.map((m) => h('option', { value: String(m), selected: m === vault.settings.autoLockMinutes }, `${m} minutes`)),
    );
    const current = passphraseField({ id: 'set-current', label: 'Current passphrase', autocomplete: 'current-password' });
    const next = passphraseField({ id: 'set-next', label: 'New passphrase', autocomplete: 'new-password', meter: true });
    const again = passphraseField({ id: 'set-again', label: 'Type the new one again', autocomplete: 'new-password' });
    const error = h('div', { role: 'alert' });

    return h(
      'section',
      { 'aria-labelledby': 'security-title' },
      h('h2', { id: 'security-title' }, 'Passphrase and locking'),
      h(
        'form',
        {
          on: {
            submit: (e) => {
              e.preventDefault();
              store.update((v) => updateSettings(v, { passphraseHint: hint.value.trim() }));
              announce('Hint saved');
            },
          },
        },
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'set-hint' }, 'Passphrase hint'),
          hint,
          h('p', { class: 'hint', id: 'set-hint-help' }, 'Stored unencrypted in the .locker file. Say where the passphrase is written, never the passphrase.'),
        ),
        h('button', { type: 'submit', class: 'btn' }, 'Save hint'),
      ),
      h('p', { class: 'inline-select' }, h('label', { for: 'set-autolock', class: 'label' }, 'Lock automatically after'), minutes),
      h(
        'form',
        { on: { submit: (e) => void this.#changePassphrase(e, current.input, next.input, again.input, error) } },
        h('h3', null, 'Change passphrase'),
        current.field,
        next.field,
        again.field,
        error,
        h('button', { type: 'submit', class: 'btn' }, 'Change passphrase'),
      ),
    );
  }

  #erase(): HTMLElement {
    return h(
      'section',
      { class: 'danger', 'aria-labelledby': 'erase-title' },
      h('h2', { id: 'erase-title' }, 'Remove from this browser'),
      h('p', null, 'Erases the encrypted locker from this browser. Any .locker files you downloaded still work.'),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-danger', on: { click: () => void this.#confirmErase() } }, icon('trash'), 'Erase from this browser')),
    );
  }

  async #keep(): Promise<void> {
    await store.keepOnDevice();
    announce('Saved on this device');
  }

  async #changePassphrase(e: SubmitEvent, current: HTMLInputElement, next: HTMLInputElement, again: HTMLInputElement, error: HTMLElement): Promise<void> {
    e.preventDefault();
    const fail = (message: string, field: HTMLInputElement): void => {
      error.replaceChildren(h('p', { class: 'error' }, icon('alert'), message));
      field.focus();
    };
    error.replaceChildren();
    if (!passphraseStrength(next.value).acceptable) return fail('Choose a longer new passphrase. Four or more unrelated words is a good target.', next);
    if (next.value !== again.value) return fail('The new passphrases don’t match.', again);
    try {
      await store.changePassphrase(current.value, next.value);
      for (const input of [current, next, again]) input.value = '';
      announce('Passphrase changed. Download a new .locker file; old files still use the old passphrase.');
    } catch (err) {
      fail(err instanceof WrongPassphraseError ? 'The current passphrase is wrong.' : 'The passphrase could not be changed.', current);
    }
  }

  async #confirmErase(): Promise<void> {
    const ok = await confirmAction({
      title: 'Erase this locker from this browser?',
      body: 'This cannot be undone. If you have no .locker backup, everything in it is gone.',
      confirmLabel: 'Erase locker',
      tone: 'danger',
    });
    if (ok) await store.erase();
  }
}

customElements.define('ll-settings', SettingsElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-settings': SettingsElement;
  }
}
