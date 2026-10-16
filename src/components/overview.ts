// <ll-overview>: readiness checklist first, then the section index.
import { assessReadiness } from '../core/readiness.ts';
import { CATEGORIES } from '../core/schema.ts';
import type { Vault } from '../core/types.ts';
import { css } from '../styles/css.ts';
import { viewStyles } from '../styles/view.ts';
import { h } from '../ui/dom.ts';
import { formatDate, plural } from '../ui/format.ts';
import { icon } from '../ui/icons.ts';
import { pageHead, VaultView } from '../ui/view.ts';

const styles = css`
  .tally { font-size: var(--step-1); color: var(--ink); }
  .tally .mono { font-size: var(--step-2); }
  .segments { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3px; height: 8px; }
  .segments span { border-radius: 1px; background: var(--rule); }
  .segments span.done { background: var(--ok); }

  .checklist { list-style: none; margin: 0; padding: 0; display: grid; }
  .checklist li {
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-3);
    align-items: start;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--rule);
  }
  .mark { display: grid; place-items: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; border: 1.5px solid var(--rule-strong); color: var(--ok); }
  .done .mark { border-color: var(--ok); background: var(--ok-soft); }
  .done .mark .icon { width: 1rem; height: 1rem; }
  .item { display: grid; gap: 2px; }
  .item a { font-weight: 650; }
  .done .item a { color: var(--ink-2); }
  .item p { color: var(--ink-2); font-size: var(--step--1); }

  .index { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
  .index a {
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-1) var(--space-3);
    height: 100%;
    padding: var(--space-4);
    border: 1px solid var(--rule);
    border-radius: var(--radius-2);
    color: var(--ink);
    text-decoration: none;
    transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
  }
  .index a:hover { border-color: var(--signature); background: var(--signature-soft); }
  .index .icon { color: var(--signature); width: 1.4rem; height: 1.4rem; }
  .index strong { font-weight: 650; }
  .index .count { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink-2); font-size: var(--step--1); }
  .index .count.zero { color: var(--ink-3); }
  .index p { grid-column: 2 / -1; font-size: var(--step--1); color: var(--ink-2); }
`;

export class OverviewElement extends VaultView {
  constructor() {
    super(viewStyles, styles);
  }

  protected renderVault(vault: Vault): Node {
    const items = assessReadiness(vault);
    const done = items.filter((i) => i.done).length;
    const name = vault.profile.ownerName;

    return h(
      'div',
      { class: 'view' },
      pageHead(
        'Overview',
        name ? `${name}’s locker` : 'Your locker',
        h(
          'p',
          { class: 'muted' },
          `${plural(vault.entries.length, 'entry', 'entries')} · Updated ${formatDate(vault.updatedAt)} · Last backup ${formatDate(vault.lastExportedAt)}`,
        ),
      ),
      h(
        'section',
        { 'aria-labelledby': 'ready-title', class: 'ruled' },
        h(
          'div',
          { class: 'section-head' },
          h('h2', { id: 'ready-title' }, 'Before you’re done'),
          h('p', { class: 'tally' }, h('span', { class: 'mono' }, String(done)), ` of ${items.length} done`),
        ),
        h('div', { class: 'segments', role: 'img', 'aria-label': `${done} of ${items.length} done` }, items.map((i) => h('span', { class: i.done ? 'done' : null }))),
        h(
          'ul',
          { class: 'checklist' },
          items.map((i) =>
            h(
              'li',
              { class: i.done ? 'done' : null },
              h('span', { class: 'mark' }, i.done ? icon('check') : null),
              h('div', { class: 'item' }, h('a', { href: `#${i.target}` }, i.label), h('p', null, i.why)),
              h('span', { class: i.done ? 'chip chip-ok' : 'chip' }, i.done ? 'Done' : 'To do'),
            ),
          ),
        ),
      ),
      h(
        'section',
        { 'aria-labelledby': 'index-title', class: 'ruled' },
        h('h2', { id: 'index-title' }, 'Sections'),
        h(
          'ul',
          { class: 'index' },
          CATEGORIES.map((c) => {
            const count = vault.entries.filter((e) => e.category === c.id).length;
            return h(
              'li',
              null,
              h(
                'a',
                { href: `#${c.id}` },
                icon(c.icon),
                h('strong', null, c.label),
                h('span', { class: count ? 'count' : 'count zero' }, count ? String(count) : 'Empty'),
                h('p', null, c.description),
              ),
            );
          }),
        ),
      ),
    );
  }
}

customElements.define('ll-overview', OverviewElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-overview': OverviewElement;
  }
}
