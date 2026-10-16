// <ll-entry>: one ledger row. Full variant edits; compact variant is read-only for the guide.
import { getCategory, PRIORITY_LABELS } from '../core/schema.ts';
import type { Entry, FieldDef } from '../core/types.ts';
import { css } from '../styles/css.ts';
import { dispatchCommand } from '../ui/commands.ts';
import { h, vh } from '../ui/dom.ts';
import { LockerElement } from '../ui/element.ts';
import { formatDate, formatRef, safeUrl, telHref } from '../ui/format.ts';
import { icon } from '../ui/icons.ts';

export type EntryVariant = 'full' | 'compact';

const styles = css`
  :host { container-type: inline-size; }
  article {
    display: grid; gap: var(--space-4);
    padding: var(--space-5) 0;
    border-top: 1px solid var(--rule);
  }
  @container (min-width: 44rem) {
    article { grid-template-columns: minmax(12rem, 17rem) minmax(0, 1fr); column-gap: var(--space-6); }
    .body { grid-column: 2; grid-row: 1 / span 2; }
  }
  .head { display: grid; gap: var(--space-2); align-content: start; min-width: 0; }
  .head h2, .head h3, .head h4 { margin: 0; font-size: var(--step-1); font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
  .meta { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; color: var(--ink-2); font-size: var(--step--1); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-inline-start: calc(-1 * var(--space-3)); }
  .body { display: grid; gap: var(--space-4); min-width: 0; }

  dl {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: var(--space-3) var(--space-5);
    margin: 0;
  }
  dl > div { min-width: 0; padding-bottom: var(--space-2); border-bottom: 1px dotted var(--rule-strong); }
  dl > div.wide { grid-column: 1 / -1; }
  dt { font-size: 0.8125rem; font-weight: 650; letter-spacing: 0.02em; color: var(--ink-3); }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd a { display: inline-flex; align-items: center; gap: var(--space-1); }
  dd a .icon { width: 1em; height: 1em; }
  .ref { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: 0.04em; }

  .family { display: grid; gap: var(--space-1); padding: var(--space-3) var(--space-4); border-radius: var(--radius-1); background: var(--paper); }
  .family p:last-child { white-space: pre-line; }
  article.compact { padding: var(--space-4) 0; }

  @media print {
    article { break-inside: avoid; padding: 10pt 0; }
    .actions { display: none; }
    .family { background: none; padding: 0; }
    a { color: inherit; text-decoration: none; }
  }
`;

function value(field: FieldDef, raw: string): Node {
  switch (field.kind) {
    case 'last4':
      return h('span', { class: 'ref' }, formatRef(raw));
    case 'tel': {
      const href = telHref(raw);
      return href ? h('a', { href }, raw) : document.createTextNode(raw);
    }
    case 'email':
      return h('a', { href: `mailto:${raw}` }, raw);
    case 'url': {
      const url = safeUrl(raw);
      if (!url) return document.createTextNode(raw);
      return h('a', { href: url.href, target: '_blank', rel: 'noopener noreferrer' }, url.host, icon('external'), vh(' (opens in a new tab)'));
    }
    case 'date':
      return document.createTextNode(formatDate(raw));
    default:
      return document.createTextNode(raw);
  }
}

export class EntryElement extends LockerElement {
  #entry: Entry | null = null;
  #variant: EntryVariant = 'full';
  #level: 2 | 3 | 4 = 2;

  constructor() {
    super(styles);
  }

  set entry(entry: Entry) {
    this.#entry = entry;
    this.requestRender();
  }

  set variant(variant: EntryVariant) {
    this.#variant = variant;
    this.classList.toggle('compact', variant === 'compact');
    this.requestRender();
  }

  set headingLevel(level: 2 | 3 | 4) {
    this.#level = level;
    this.requestRender();
  }

  connectedCallback(): void {
    this.renderNow();
  }

  protected render(): Node {
    const entry = this.#entry;
    if (!entry) return h('div');
    const category = getCategory(entry.category);
    const headingId = `entry-${entry.id}`;
    const fields = category.fields.filter((f) => entry.fields[f.key]);
    const shown = this.#variant === 'compact' ? fields.filter((f) => f.summary || f.kind === 'tel' || f.wide) : fields;
    const heading = h(`h${this.#level}` as 'h2' | 'h3' | 'h4', { id: headingId }, entry.title);

    return h(
      'article',
      { 'aria-labelledby': headingId, class: this.#variant },
      h(
        'div',
        { class: 'head' },
        heading,
        h(
          'p',
          { class: 'meta' },
          h('span', { class: `chip chip-${entry.priority}` }, PRIORITY_LABELS[entry.priority]),
          this.#variant === 'compact' ? h('span', null, category.label) : h('span', null, `Updated ${formatDate(entry.updatedAt)}`),
        ),
        this.#variant === 'full' ? this.#actions(entry) : null,
      ),
      h(
        'div',
        { class: 'body' },
        shown.length
          ? h(
              'dl',
              null,
              shown.map((f) => h('div', { class: f.wide ? 'wide' : null }, h('dt', null, f.label), h('dd', null, value(f, entry.fields[f.key] ?? '')))),
            )
          : null,
        entry.notes ? h('div', { class: 'family' }, h('p', { class: 'eyebrow' }, 'For family'), h('p', null, entry.notes)) : null,
      ),
    );
  }

  #actions(entry: Entry): HTMLElement {
    return h(
      'div',
      { class: 'actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-quiet',
          'data-focus': `edit-${entry.id}`,
          on: { click: () => dispatchCommand(this, { type: 'edit-entry', category: entry.category, entryId: entry.id }) },
        },
        icon('edit'),
        'Edit',
        vh(` ${entry.title}`),
      ),
      h(
        'button',
        { type: 'button', class: 'btn btn-quiet', on: { click: () => dispatchCommand(this, { type: 'delete-entry', entryId: entry.id }) } },
        icon('trash'),
        'Delete',
        vh(` ${entry.title}`),
      ),
    );
  }
}

customElements.define('ll-entry', EntryElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-entry': EntryElement;
  }
}
