// <ll-category>: the ledger of entries for one section, with a designed empty state.
import { getCategory } from '../core/schema.ts';
import type { CategoryId, Vault } from '../core/types.ts';
import { entriesIn } from '../core/vault.ts';
import { css } from '../styles/css.ts';
import { viewStyles } from '../styles/view.ts';
import { dispatchCommand } from '../ui/commands.ts';
import { h } from '../ui/dom.ts';
import { plural } from '../ui/format.ts';
import { icon } from '../ui/icons.ts';
import { pageHead, VaultView } from '../ui/view.ts';
import { EntryElement } from './entry.ts';

const styles = css`
  .ledger { display: grid; border-bottom: 1px solid var(--rule); }
`;

export class CategoryElement extends VaultView {
  #category: CategoryId = 'banking';
  /** Keyed by entry id so rows keep their DOM (and focus) across renders. */
  readonly #rows = new Map<string, EntryElement>();

  constructor() {
    super(viewStyles, styles);
  }

  set category(id: CategoryId) {
    if (id === this.#category) return;
    this.#category = id;
    this.#rows.clear();
    this.requestRender();
  }

  #add = (): void => dispatchCommand(this, { type: 'edit-entry', category: this.#category, entryId: null });

  protected renderVault(vault: Vault): Node {
    const def = getCategory(this.#category);
    const entries = entriesIn(vault, def.id);
    const addButton = h(
      'button',
      { type: 'button', class: 'btn btn-primary', 'data-focus': 'add-entry', on: { click: this.#add } },
      icon('plus'),
      `Add a ${def.singular}`,
    );

    const live = new Set(entries.map((e) => e.id));
    for (const id of this.#rows.keys()) if (!live.has(id)) this.#rows.delete(id);
    const rows = entries.map((entry) => {
      let row = this.#rows.get(entry.id);
      if (!row) {
        row = new EntryElement();
        this.#rows.set(entry.id, row);
      }
      row.entry = entry;
      return row;
    });

    return h(
      'div',
      { class: 'view' },
      pageHead(
        entries.length ? plural(entries.length, 'entry', 'entries') : 'Section',
        def.label,
        h('p', { class: 'muted' }, def.description),
        h('div', { class: 'row' }, addButton),
      ),
      entries.length
        ? h('div', { class: 'ledger' }, rows)
        : h(
            'div',
            { class: 'empty' },
            icon(def.icon),
            h('p', null, def.prompt),
            h('ul', { 'aria-label': 'You’ll be asked for' }, def.fields.slice(0, 6).map((f) => h('li', null, f.label))),
            h('button', { type: 'button', class: 'btn', on: { click: this.#add } }, icon('plus'), `Add your first ${def.singular}`),
          ),
    );
  }
}

customElements.define('ll-category', CategoryElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-category': CategoryElement;
  }
}
