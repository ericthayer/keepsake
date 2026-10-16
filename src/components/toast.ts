// <ll-toast>: one polite live region for status messages.
import { css } from '../styles/css.ts';
import { h } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';
import { LockerElement } from '../ui/element.ts';

export type Tone = 'info' | 'error';

const styles = css`
  :host {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    padding: 0 max(16px, env(safe-area-inset-right, 0px)) calc(var(--space-5) + env(safe-area-inset-bottom, 0px))
      max(16px, env(safe-area-inset-left, 0px));
    pointer-events: none;
  }
  .toast {
    display: flex; align-items: center; gap: var(--space-2);
    max-width: 32rem;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-2);
    background: var(--ink);
    color: var(--page);
    font-weight: 600;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
    animation: rise var(--dur) var(--ease);
  }
  .toast.error { background: var(--danger); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
  @media print { :host { display: none; } }
`;

export class ToastElement extends LockerElement {
  #message = '';
  #tone: Tone = 'info';
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #region = h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });

  constructor() {
    super(styles);
  }

  connectedCallback(): void {
    this.root.replaceChildren(this.#region);
  }

  show(message: string, tone: Tone = 'info'): void {
    this.#message = message;
    this.#tone = tone;
    clearTimeout(this.#timer);
    this.#region.replaceChildren(this.render());
    this.#timer = setTimeout(() => this.#region.replaceChildren(), tone === 'error' ? 7000 : 3500);
  }

  protected render(): Node {
    return h('div', { class: `toast ${this.#tone}` }, icon(this.#tone === 'error' ? 'alert' : 'check'), this.#message);
  }
}

customElements.define('ll-toast', ToastElement);

export function announce(message: string, tone: Tone = 'info'): void {
  let toast = document.querySelector('ll-toast');
  if (!(toast instanceof ToastElement)) {
    toast = document.body.appendChild(new ToastElement());
  }
  (toast as ToastElement).show(message, tone);
}

declare global {
  interface HTMLElementTagNameMap {
    'll-toast': ToastElement;
  }
}
