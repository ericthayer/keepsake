// <ll-gate>: create a locker, unlock one, open a .locker file, or explore sample data.
import { passphraseStrength, WrongPassphraseError } from '../core/crypto.ts';
import type { VaultState } from '../core/store.ts';
import type { IconName } from '../core/types.ts';
import { h } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';
import { LockerElement } from '../ui/element.ts';
import { store } from '../ui/context.ts';
import { confirmAction } from './confirm.ts';
import { gateStyles } from './gate.styles.ts';
import { passphraseField, passphraseStyles } from './passphrase-field.ts';

type GateState = Extract<VaultState, { status: 'setup' | 'locked' }>;

const FACTS: readonly [IconName, string, string][] = [
  ['lock', 'Encrypted in this browser.', 'AES-256 with your passphrase. It never leaves this device.'],
  ['check', 'No account, server, or tracking.', 'Nothing is sent anywhere. The site makes no outside requests.'],
  ['download', 'A file your family can open.', 'Download a .locker file and keep it with your will.'],
];

export class GateElement extends LockerElement {
  #state: GateState | null = null;
  readonly #errorSlot = h('div', { class: 'error-slot', role: 'alert' });

  constructor() {
    super(passphraseStyles, gateStyles);
  }

  set state(state: GateState) {
    this.#state = state;
    this.renderNow();
  }

  protected render(): Node {
    const state = this.#state;
    if (!state) return h('div');
    return h(
      'main',
      { class: 'gate' },
      this.#intro(state),
      h('section', { class: 'panel', 'aria-labelledby': 'panel-title' }, ...(state.status === 'setup' ? this.#create() : this.#unlock(state)), this.#alternatives(state)),
    );
  }

  #intro(state: GateState): HTMLElement {
    const forFamily = state.status === 'locked' && state.source !== 'device';
    const heading =
      state.status === 'setup' ? 'Where everything is, for the people who will need to know.' : forFamily ? 'A locker was left for you.' : 'Welcome back.';
    const lede =
      state.status === 'setup'
        ? 'Record your accounts, policies, documents, and the people to call, so your family isn’t searching through drawers and old statements.'
        : forFamily
          ? 'It lists where accounts, policies, and documents are, and who to call first. The passphrase is usually kept with the will or by the executor.'
          : 'Your locker is encrypted on this device. Enter your passphrase to open it.';
    return h(
      'header',
      { class: 'intro' },
      h('p', { class: 'brand' }, icon('lock'), 'Life Locker'),
      h('h1', { tabindex: '-1' }, heading),
      h('p', { class: 'lede' }, lede),
      state.status === 'setup'
        ? h('ul', { class: 'facts' }, FACTS.map(([name, strong, rest]) => h('li', null, icon(name), h('span', null, h('strong', null, strong), ' ', rest))))
        : null,
    );
  }

  #create(): Node[] {
    const name = h('input', { id: 'gate-name', name: 'name', autocomplete: 'name', required: true, 'data-focus': 'gate-name' });
    const pass = passphraseField({
      id: 'gate-pass',
      label: 'Passphrase',
      autocomplete: 'new-password',
      meter: true,
      hint: 'Four or more unrelated words work well, like “harbor maple seventy lantern”.',
    });
    const confirm = passphraseField({ id: 'gate-pass2', label: 'Type it again', autocomplete: 'new-password' });
    const hint = h('input', { id: 'gate-hint', name: 'hint', maxlength: '280', 'aria-describedby': 'gate-hint-help', 'data-focus': 'gate-hint' });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary submit' }, 'Create locker');

    const form = h(
      'form',
      { novalidate: true, on: { submit: (e) => void this.#onCreate(e, name, pass.input, confirm.input, hint, submit) } },
      h('div', { class: 'field' }, h('label', { for: 'gate-name' }, 'Your name'), name),
      pass.field,
      confirm.field,
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'gate-hint' }, 'Passphrase hint (optional)'),
        hint,
        h('p', { class: 'hint', id: 'gate-hint-help' }, 'Saved unencrypted so family can find the passphrase. For example, “On the card in the fireproof box.”'),
      ),
      h('p', { class: 'caution' }, icon('alert'), 'There is no reset. If the passphrase is lost, nobody can open the locker. Write it down and keep it with your will.'),
      this.#errorSlot,
      submit,
    );
    return [h('h2', { id: 'panel-title' }, 'Start your locker'), form];
  }

  #unlock(state: Extract<GateState, { status: 'locked' }>): Node[] {
    const title =
      state.source === 'device' ? 'Unlock your locker' : state.source === 'published' ? 'Open the family locker' : `Open ${state.fileName ?? 'file'}`;
    const pass = passphraseField({ id: 'gate-unlock', label: 'Passphrase', autocomplete: 'current-password' });
    const submit = h('button', { type: 'submit', class: 'btn btn-primary submit' }, 'Unlock');
    const form = h(
      'form',
      { on: { submit: (e) => void this.#onUnlock(e, pass.input, submit) } },
      state.hint ? h('p', { class: 'hint-card' }, h('span', { class: 'label' }, 'Passphrase hint'), state.hint) : null,
      pass.field,
      this.#errorSlot,
      submit,
    );
    return [h('h2', { id: 'panel-title' }, title), form];
  }

  #alternatives(state: GateState): HTMLElement {
    const picker = h('input', { type: 'file', accept: '.locker,application/json', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
    picker.addEventListener('change', () => void this.#onFile(picker));
    const link = (label: string, iconName: IconName, run: () => void): HTMLLIElement =>
      h('li', null, h('button', { type: 'button', class: 'btn btn-quiet', on: { click: run } }, icon(iconName), label));

    const items: HTMLLIElement[] = [];
    if (state.status === 'locked' && state.source !== 'device' && state.hasDevice) {
      items.push(link('Unlock the locker saved on this device', 'lock', () => store.showLocked('device')));
    }
    if (state.status === 'locked' && state.source !== 'published' && state.hasPublished) {
      items.push(link('Open the family copy published here', 'guide', () => store.showLocked('published')));
    }
    if (state.status === 'setup' && (state.hasDevice || state.hasPublished)) {
      items.push(link('Back to unlock', 'lock', () => store.showLocked(state.hasDevice ? 'device' : 'published')));
    }
    items.push(link('Open a .locker file', 'upload', () => picker.click()));
    if (state.status === 'locked') items.push(link('Start a new locker', 'plus', () => store.showSetup()));
    if (state.status === 'setup') items.push(link('Explore with sample data', 'overview', () => store.explore()));
    return h('ul', { class: 'alt', 'aria-label': 'Other options' }, items, picker);
  }

  #showError(message: string): void {
    this.#errorSlot.replaceChildren(h('p', { class: 'error' }, icon('alert'), message));
  }

  #fail(message: string, field: HTMLInputElement): void {
    this.#showError(message);
    field.focus();
  }

  #busy(button: HTMLButtonElement, label: string | null): void {
    button.disabled = label !== null;
    button.setAttribute('aria-busy', String(label !== null));
    if (label) button.textContent = label;
  }

  async #onCreate(e: SubmitEvent, name: HTMLInputElement, pass: HTMLInputElement, again: HTMLInputElement, hint: HTMLInputElement, submit: HTMLButtonElement): Promise<void> {
    e.preventDefault();
    this.#errorSlot.replaceChildren();
    if (!name.value.trim()) return this.#fail('Enter your name. It appears on the family guide.', name);
    if (!passphraseStrength(pass.value).acceptable) {
      return this.#fail('Choose a longer passphrase. Four or more unrelated words is a good target.', pass);
    }
    if (pass.value !== again.value) return this.#fail('The two passphrases don’t match.', again);
    if (this.#state?.status === 'setup' && this.#state.hasDevice) {
      const ok = await confirmAction({
        title: 'Replace the locker on this device?',
        body: 'This browser already has a locker. Creating a new one erases it. Download a backup of the old one first if you need it.',
        confirmLabel: 'Replace it',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.#busy(submit, 'Creating…');
    await store.create(name.value, pass.value, hint.value);
  }

  async #onUnlock(e: SubmitEvent, pass: HTMLInputElement, submit: HTMLButtonElement): Promise<void> {
    e.preventDefault();
    this.#errorSlot.replaceChildren();
    if (!pass.value) return this.#fail('Enter the passphrase.', pass);
    this.#busy(submit, 'Unlocking…');
    try {
      await store.unlock(pass.value);
    } catch (error) {
      this.#busy(submit, null);
      submit.textContent = 'Unlock';
      this.#showError(error instanceof WrongPassphraseError ? 'That passphrase doesn’t open this locker. Check the hint and try again.' : 'This locker could not be read.');
      pass.select();
      pass.focus();
    }
  }

  async #onFile(picker: HTMLInputElement): Promise<void> {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    try {
      await store.openFile(file);
      this.root.querySelector<HTMLInputElement>('#gate-unlock')?.focus();
    } catch (error) {
      this.#showError(error instanceof Error ? error.message : 'That file could not be opened.');
    }
  }
}

customElements.define('ll-gate', GateElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-gate': GateElement;
  }
}
