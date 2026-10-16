// Base for routed views: re-renders on every store change while connected.
import type { Mode } from '../core/store.ts';
import type { Vault } from '../core/types.ts';
import { store } from './context.ts';
import { h } from './dom.ts';
import { LockerElement } from './element.ts';

export abstract class VaultView extends LockerElement {
  #unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.#unsubscribe = store.subscribe(() => this.requestRender());
    this.renderNow();
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  protected render(): Node {
    const state = store.state;
    return state.status === 'unlocked' ? this.renderVault(state.vault, state.mode) : h('div');
  }

  protected abstract renderVault(vault: Vault, mode: Mode): Node;
}

export function pageHead(eyebrow: string, title: string, ...rest: Node[]): HTMLElement {
  return h('header', { class: 'page-head' }, h('p', { class: 'eyebrow' }, eyebrow), h('h1', { tabindex: '-1' }, title), ...rest);
}
