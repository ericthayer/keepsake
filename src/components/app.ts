// <ll-app>: swaps between the gate and the shell as the store's status changes.
// Light DOM on purpose: it holds no styles of its own.
import type { VaultState } from '../core/store.ts';
import { startIdleLock, store } from '../ui/context.ts';
import { GateElement } from './gate.ts';
import { ShellElement } from './shell.ts';
import { announce } from './toast.ts';

export class AppElement extends HTMLElement {
  #shown: 'loading' | 'gate' | 'shell' = 'loading';
  #stopIdle: (() => void) | null = null;
  #unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.#unsubscribe = store.subscribe((state) => this.#sync(state));
    store.addEventListener('save-error', this.#onSaveError);
    this.#sync(store.state);
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#stopIdle?.();
    store.removeEventListener('save-error', this.#onSaveError);
  }

  #sync(state: VaultState): void {
    if (state.status === 'loading') return;

    if (state.status === 'unlocked') {
      if (this.#shown !== 'shell') {
        this.#shown = 'shell';
        this.replaceChildren(new ShellElement());
        window.scrollTo({ top: 0 });
        if (state.mode !== 'demo') this.#startIdle();
      }
      return;
    }

    this.#stopIdle?.();
    this.#stopIdle = null;
    let gate = this.firstElementChild;
    if (!(gate instanceof GateElement)) {
      gate = new GateElement();
      this.replaceChildren(gate);
    }
    const wasShell = this.#shown === 'shell';
    this.#shown = 'gate';
    (gate as GateElement).state = state;
    if (state.status === 'locked') {
      requestAnimationFrame(() => (gate as GateElement).shadowRoot?.querySelector<HTMLInputElement>('#gate-unlock')?.focus());
    }
    if (wasShell) announce('Locked');
  }

  #startIdle(): void {
    this.#stopIdle?.();
    this.#stopIdle = startIdleLock(
      () => (store.state.status === 'unlocked' ? store.state.vault.settings.autoLockMinutes : 10),
      () => {
        if (store.state.status === 'unlocked' && store.state.mode !== 'demo') void store.lock();
      },
    );
  }

  #onSaveError = (): void => {
    announce('Your last change could not be saved in this browser. Download a backup now.', 'error');
  };
}

customElements.define('ll-app', AppElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-app': AppElement;
  }
}
