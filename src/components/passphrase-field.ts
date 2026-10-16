// Passphrase input with a show/hide toggle and an optional live strength meter.
import { passphraseStrength } from '../core/crypto.ts';
import { css } from '../styles/css.ts';
import { h } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';

/** Adopt alongside a component's own sheet wherever passphraseField() is used. */
export const passphraseStyles = css`
  .reveal-wrap { position: relative; }
  .reveal-wrap input { padding-right: 3.25rem; }
  .reveal { position: absolute; top: 0; right: 0; height: 100%; }
  .meter { display: flex; align-items: center; gap: var(--space-3); }
  .meter-track { flex: 0 0 6rem; height: 4px; border-radius: 2px; background: var(--rule); overflow: hidden; }
  .meter-bar { display: block; height: 100%; width: 0; transition: width var(--dur) var(--ease), background var(--dur); }
  .meter-bar[data-score='1'] { width: 33%; background: var(--danger); }
  .meter-bar[data-score='2'] { width: 66%; background: var(--warn); }
  .meter-bar[data-score='3'] { width: 100%; background: var(--ok); }
`;

export interface PassphraseFieldOptions {
  readonly id: string;
  readonly label: string;
  readonly autocomplete: 'new-password' | 'current-password';
  readonly meter?: boolean;
  readonly hint?: string;
}

export interface PassphraseField {
  readonly field: HTMLElement;
  readonly input: HTMLInputElement;
}

export function passphraseField(options: PassphraseFieldOptions): PassphraseField {
  const { id, label, autocomplete, meter = false, hint } = options;
  const hintId = `${id}-hint`;
  const meterId = `${id}-meter`;
  const describedBy = [hint ? hintId : '', meter ? meterId : ''].filter(Boolean).join(' ');

  const input = h('input', {
    id,
    name: id,
    type: 'password',
    autocomplete,
    required: true,
    minlength: autocomplete === 'new-password' ? 12 : null,
    spellcheck: 'false',
    autocapitalize: 'off',
    'aria-describedby': describedBy || null,
    'data-focus': id,
  });

  const toggle = h('button', {
    type: 'button',
    class: 'btn btn-quiet btn-icon reveal',
    'aria-controls': id,
    'aria-pressed': 'false',
    'aria-label': 'Show passphrase',
  });
  toggle.append(icon('eye'));
  toggle.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!showing));
    toggle.setAttribute('aria-label', showing ? 'Show passphrase' : 'Hide passphrase');
    toggle.replaceChildren(icon(showing ? 'eye' : 'eye-off'));
    input.focus();
  });

  const field = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h('div', { class: 'reveal-wrap' }, input, toggle),
    hint ? h('p', { class: 'hint', id: hintId }, hint) : null,
  );

  if (meter) {
    const bar = h('span', { class: 'meter-bar', 'data-score': '0' });
    const text = h('span', { class: 'meter-text' }, 'At least 12 characters.');
    field.append(h('p', { class: 'meter hint', id: meterId, 'aria-live': 'polite' }, h('span', { class: 'meter-track' }, bar), text));
    input.addEventListener('input', () => {
      const strength = passphraseStrength(input.value);
      bar.dataset['score'] = String(input.value ? strength.score : 0);
      text.textContent = input.value ? `Strength: ${strength.label}` : 'At least 12 characters.';
    });
  }

  return { field, input };
}
