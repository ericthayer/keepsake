// <ll-guide>: the read-first view for family. Letter, who to call, then steps in order.
import { GUIDE_STEPS } from '../core/guide-steps.ts';
import { PRIORITY_LABELS } from '../core/schema.ts';
import type { Mode } from '../core/store.ts';
import type { Entry, Vault } from '../core/types.ts';
import { PRIORITIES } from '../core/types.ts';
import { css } from '../styles/css.ts';
import { viewStyles } from '../styles/view.ts';
import { h } from '../ui/dom.ts';
import { formatDate, paragraphs, telHref } from '../ui/format.ts';
import { icon } from '../ui/icons.ts';
import { pageHead, VaultView } from '../ui/view.ts';
import { EntryElement } from './entry.ts';

const styles = css`
  .letter {
    gap: var(--space-4);
    max-width: var(--measure);
    padding: var(--space-6);
    border: 1px solid var(--rule);
    border-radius: var(--radius-2);
    background: var(--paper);
    font-size: var(--step-1);
    line-height: 1.6;
  }
  .signature { font: 400 var(--step-3) / 1 var(--font-display); color: var(--signature); }
  .letter.missing { font-size: var(--step-0); border-style: dashed; background: none; }

  .people { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
  .people li { display: grid; gap: 2px; padding: var(--space-3) 0; border-top: 2px solid var(--ink); }
  .people .role { font-size: var(--step--1); font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
  .people .name { font-size: var(--step-1); font-weight: 650; }

  .phase-head { display: flex; align-items: baseline; gap: var(--space-3); padding-top: var(--space-4); border-top: 2px solid var(--ink); }
  .phase-head .num { font: 400 var(--step-4) / 1 var(--font-display); color: var(--signature); }
  .steps { margin: 0; padding: 0; list-style: none; display: grid; gap: 0; counter-reset: step; }
  .steps li { display: grid; grid-template-columns: 2.25rem minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--rule); counter-increment: step; }
  .steps li::before { content: counter(step); font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink-3); padding-top: 0.1em; }
  .steps strong { display: block; font-weight: 650; }
  .steps p { color: var(--ink-2); font-size: var(--step--1); }
  .yours { display: grid; gap: var(--space-2); }
  .yours > h3 { color: var(--ink-2); font-size: var(--step--1); letter-spacing: 0.06em; text-transform: uppercase; }
  .disclaimer { color: var(--ink-3); font-size: var(--step--1); border-top: 1px solid var(--rule); padding-top: var(--space-4); }

  @media print {
    .letter { border: none; padding: 0; background: none; }
    .phase { break-before: auto; }
  }
`;

export class GuideElement extends VaultView {
  constructor() {
    super(viewStyles, styles);
  }

  protected renderVault(vault: Vault, mode: Mode): Node {
    const name = vault.profile.ownerName || 'the owner';
    const contacts = vault.entries.filter((e) => e.category === 'contacts');
    const print = h('button', { type: 'button', class: 'btn', on: { click: () => window.print() } }, icon('print'), 'Print this guide');

    return h(
      'div',
      { class: 'view' },
      pageHead(
        'Family guide',
        'If you’re reading this',
        h('p', { class: 'muted' }, `Prepared by ${name}. Last updated ${formatDate(vault.updatedAt)}.`),
        h('div', { class: 'row no-print' }, print),
      ),
      this.#letter(vault, mode),
      contacts.length ? this.#people(contacts) : null,
      PRIORITIES.map((p, i) => this.#phase(vault, p, i + 1)),
      h('p', { class: 'disclaimer' }, 'General guidance for the United States, not legal or tax advice. Rules vary by state; the executor and attorney have the final word.'),
    );
  }

  #letter(vault: Vault, mode: Mode): HTMLElement {
    const paras = paragraphs(vault.profile.letter);
    if (!paras.length) {
      return h(
        'section',
        { class: 'letter missing', 'aria-label': 'Letter' },
        h('p', null, mode === 'copy' ? 'No letter was left.' : 'Your family reads this page first. Add a few lines about where to start.'),
        mode === 'copy' ? null : h('p', null, h('a', { href: '#settings' }, 'Write your letter')),
      );
    }
    return h(
      'section',
      { class: 'letter', 'aria-labelledby': 'letter-title' },
      h('h2', { id: 'letter-title', class: 'vh' }, `A letter from ${vault.profile.ownerName}`),
      paras.map((p) => h('p', null, p)),
      vault.profile.ownerName ? h('p', { class: 'signature' }, vault.profile.ownerName) : null,
    );
  }

  #people(contacts: readonly Entry[]): HTMLElement {
    return h(
      'section',
      { 'aria-labelledby': 'people-title' },
      h('h2', { id: 'people-title' }, 'Who to call'),
      h(
        'ul',
        { class: 'people' },
        contacts.map((c) => {
          const phone = c.fields['phone'];
          const href = phone ? telHref(phone) : null;
          return h(
            'li',
            null,
            h('span', { class: 'role' }, c.fields['role'] ?? 'Contact'),
            h('span', { class: 'name' }, c.title),
            c.fields['organization'] ? h('span', { class: 'muted' }, c.fields['organization']) : null,
            phone ? (href ? h('a', { href }, phone) : h('span', null, phone)) : null,
            c.fields['email'] ? h('a', { href: `mailto:${c.fields['email']}` }, c.fields['email']) : null,
          );
        }),
      ),
    );
  }

  #phase(vault: Vault, priority: (typeof PRIORITIES)[number], index: number): HTMLElement {
    const headingId = `phase-${priority}`;
    const entries = vault.entries.filter((e) => e.priority === priority && e.category !== 'contacts');
    return h(
      'section',
      { class: 'phase', 'aria-labelledby': headingId },
      h('div', { class: 'phase-head' }, h('span', { class: 'num', 'aria-hidden': 'true' }, String(index)), h('h2', { id: headingId }, PRIORITY_LABELS[priority])),
      h(
        'ol',
        { class: 'steps' },
        GUIDE_STEPS[priority].map((s) => h('li', null, h('div', null, h('strong', null, s.title), h('p', null, s.detail)))),
      ),
      entries.length
        ? h(
            'div',
            { class: 'yours' },
            h('h3', null, `In this locker · ${PRIORITY_LABELS[priority].toLowerCase()}`),
            entries.map((entry) => {
              const row = new EntryElement();
              row.variant = 'compact';
              row.headingLevel = 4;
              row.entry = entry;
              return row;
            }),
          )
        : null,
    );
  }
}

customElements.define('ll-guide', GuideElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-guide': GuideElement;
  }
}
