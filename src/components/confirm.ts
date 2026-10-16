// <ll-confirm>: modal confirmation built on <dialog>. Use confirmAction() to open one.
import { css } from '../styles/css.ts';
import { deepActiveElement, h, restoreFocus } from '../ui/dom.ts';
import { LockerElement } from '../ui/element.ts';

export interface ConfirmOptions {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly tone?: 'default' | 'danger';
}

export const dialogStyles = css`
  dialog {
    width: min(34rem, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius-2);
    background: var(--page);
    color: var(--ink);
    box-shadow: 0 24px 64px rgb(0 0 0 / 0.25);
  }
  dialog[open] { animation: appear var(--dur) var(--ease); }
  dialog::backdrop { background: var(--scrim); }
  @keyframes appear { from { opacity: 0; transform: translateY(6px) scale(0.985); } }
  .dialog-body { display: grid; gap: var(--space-4); padding: var(--space-5); }
  .dialog-body h2 { font: 400 var(--step-3) / 1.15 var(--font-display); }
  .dialog-actions {
    display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2);
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--rule);
  }
`;

export class ConfirmElement extends LockerElement {
  #options: ConfirmOptions = { title: '', body: '', confirmLabel: 'Confirm' };
  #resolve: ((ok: boolean) => void) | null = null;

  constructor() {
    super(dialogStyles);
  }

  ask(options: ConfirmOptions): Promise<boolean> {
    this.#options = options;
    this.renderNow();
    const dialog = this.root.querySelector('dialog');
    dialog?.showModal();
    this.root.querySelector<HTMLButtonElement>('[data-role="cancel"]')?.focus();
    return new Promise((resolve) => (this.#resolve = resolve));
  }

  #close(ok: boolean): void {
    this.root.querySelector('dialog')?.close();
    this.#resolve?.(ok);
    this.#resolve = null;
    this.remove();
  }

  protected render(): Node {
    const { title, body, confirmLabel, tone } = this.#options;
    return h(
      'dialog',
      {
        'aria-labelledby': 'confirm-title',
        'aria-describedby': 'confirm-body',
        on: { cancel: (e) => (e.preventDefault(), this.#close(false)) },
      },
      h('div', { class: 'dialog-body' }, h('h2', { id: 'confirm-title' }, title), h('p', { id: 'confirm-body' }, body)),
      h(
        'div',
        { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn', 'data-role': 'cancel', on: { click: () => this.#close(false) } }, 'Cancel'),
        h(
          'button',
          { type: 'button', class: tone === 'danger' ? 'btn btn-danger solid' : 'btn btn-primary', on: { click: () => this.#close(true) } },
          confirmLabel,
        ),
      ),
    );
  }
}

customElements.define('ll-confirm', ConfirmElement);

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const restore = deepActiveElement();
  const el = document.body.appendChild(new ConfirmElement());
  return el.ask(options).finally(() => restoreFocus(restore));
}

declare global {
  interface HTMLElementTagNameMap {
    'll-confirm': ConfirmElement;
  }
}
