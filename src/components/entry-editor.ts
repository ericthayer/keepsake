// <ll-entry-editor>: schema-driven add/edit dialog with the sensitive-data guard inline.
import { inspect } from '../core/guard.ts';
import { getCategory, PRIORITY_LABELS } from '../core/schema.ts';
import type { CategoryId, Entry, EntryDraft, FieldDef, Priority, TextFieldKind } from '../core/types.ts';
import { PRIORITIES } from '../core/types.ts';
import { upsertEntry } from '../core/vault.ts';
import { css } from '../styles/css.ts';
import { store } from '../ui/context.ts';
import { deepActiveElement, h, restoreFocus } from '../ui/dom.ts';
import { LockerElement } from '../ui/element.ts';
import { icon } from '../ui/icons.ts';
import { dialogStyles } from './confirm.ts';
import { announce } from './toast.ts';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const styles = css`
  dialog { width: min(46rem, calc(100vw - 32px)); }
  form { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; max-height: calc(100dvh - 34px); }
  .dialog-head { display: flex; justify-content: space-between; gap: var(--space-4); align-items: start; padding: var(--space-5) var(--space-5) var(--space-4); border-bottom: 1px solid var(--rule); }
  .dialog-head h2 { font: 400 var(--step-3) / 1.15 var(--font-display); }
  .scroll { overflow-y: auto; padding: var(--space-5); container-type: inline-size; }
  .grid { display: grid; gap: var(--space-4); }
  @container (min-width: 34rem) {
    .grid { grid-template-columns: 1fr 1fr; }
    .wide { grid-column: 1 / -1; }
  }
  .guard:empty { display: none; }
  .summary { padding: var(--space-3) var(--space-4); border-radius: var(--radius-1); background: var(--warn-soft); }
  .summary:empty { display: none; }
`;

const KIND_ATTRS: Readonly<Record<TextFieldKind, Record<string, string>>> = {
  text: { type: 'text' },
  textarea: {},
  tel: { type: 'tel', autocomplete: 'off', inputmode: 'tel' },
  email: { type: 'email', autocomplete: 'off' },
  url: { type: 'url', inputmode: 'url', placeholder: 'example.com' },
  date: { type: 'date' },
  currency: { type: 'text', inputmode: 'decimal', placeholder: '$' },
  last4: { type: 'text', inputmode: 'numeric', maxlength: '4', pattern: '[0-9A-Za-z]{0,4}', class: 'mono', placeholder: '1234' },
};

export class EntryEditorElement extends LockerElement {
  #category: CategoryId = 'banking';
  #entry: Entry | null = null;
  #restoreFocus: Element | null = null;
  #confirmedRisk = false;

  constructor() {
    super(dialogStyles, styles);
  }

  open(category: CategoryId, entry: Entry | null): void {
    this.#category = category;
    this.#entry = entry;
    this.#confirmedRisk = false;
    this.#restoreFocus = deepActiveElement();
    this.renderNow();
    this.root.querySelector('dialog')?.showModal();
    this.root.querySelector<HTMLInputElement>('#entry-title')?.focus();
  }

  #close(): void {
    this.root.querySelector('dialog')?.close();
  }

  protected render(): Node {
    const def = getCategory(this.#category);
    const entry = this.#entry;
    const title = entry ? `Edit ${entry.title}` : `Add a ${def.singular}`;

    const priority = h(
      'select',
      { id: 'entry-priority', name: 'priority' },
      PRIORITIES.map((p) => h('option', { value: p, selected: (entry?.priority ?? 'first-month') === p }, PRIORITY_LABELS[p])),
    );

    return h(
      'dialog',
      {
        'aria-labelledby': 'editor-title',
        on: { close: () => this.#onClosed() },
      },
      h(
        'form',
        { method: 'dialog', novalidate: true, on: { submit: (e) => this.#onSubmit(e) } },
        h(
          'div',
          { class: 'dialog-head' },
          h('div', null, h('p', { class: 'eyebrow' }, def.label), h('h2', { id: 'editor-title' }, title)),
          h('button', { type: 'button', class: 'btn btn-quiet btn-icon', 'aria-label': 'Close', on: { click: () => this.#close() } }, icon('close')),
        ),
        h(
          'div',
          { class: 'scroll' },
          h(
            'div',
            { class: 'grid' },
            this.#field({ key: 'title', label: 'Name for this entry', kind: 'text', wide: true, hint: 'How your family would recognize it, like “Joint checking”.' }, entry?.title ?? '', true),
            def.fields.map((f) => this.#field(f, entry?.fields[f.key] ?? '')),
            h(
              'div',
              { class: 'field' },
              h('label', { for: 'entry-priority' }, 'When does family need this?'),
              priority,
              h('p', { class: 'hint' }, 'Sets where it appears in the family guide.'),
            ),
            this.#field(
              { key: 'notes', label: 'Instructions for family', kind: 'textarea', wide: true, hint: 'What to do, who to call, and anything they should not do.' },
              entry?.notes ?? '',
            ),
          ),
        ),
        h(
          'div',
          { class: 'dialog-actions' },
          h('p', { class: 'summary warning', id: 'guard-summary', role: 'alert' }),
          h('button', { type: 'button', class: 'btn', on: { click: () => this.#close() } }, 'Cancel'),
          h('button', { type: 'submit', class: 'btn btn-primary', id: 'entry-save' }, entry ? 'Save changes' : 'Add to locker'),
        ),
      ),
    );
  }

  #field(def: FieldDef, current: string, required = false): HTMLElement {
    const id = `entry-${def.key}`;
    const guardId = `${id}-guard`;
    const hintId = `${id}-hint`;
    const describedBy = [def.hint ? hintId : '', guardId].filter(Boolean).join(' ');
    let control: Control;

    if (def.kind === 'select') {
      control = h(
        'select',
        { id, name: def.key, 'aria-describedby': describedBy },
        h('option', { value: '' }, 'Choose…'),
        def.options.map((o) => h('option', { value: o, selected: o === current }, o)),
      );
      if (current && !def.options.includes(current)) control.append(h('option', { value: current, selected: true }, current));
    } else if (def.kind === 'textarea') {
      control = h('textarea', { id, name: def.key, rows: '4', 'aria-describedby': describedBy }, current);
    } else {
      control = h('input', { id, name: def.key, value: current, required, 'aria-describedby': describedBy, ...KIND_ATTRS[def.kind] });
    }

    const guard = h('div', { class: 'guard', id: guardId });
    if (def.kind !== 'select') {
      const kind = def.kind;
      const check = (): void => {
        const findings = inspect(control.value, kind);
        control.setAttribute('aria-invalid', String(findings.length > 0));
        guard.replaceChildren(...findings.map((f) => h('p', { class: 'warning' }, icon('alert'), f.message)));
        this.#confirmedRisk = false;
      };
      control.addEventListener('input', check);
      if (current) queueMicrotask(check);
    }

    return h(
      'div',
      { class: `field${def.wide ? ' wide' : ''}` },
      h('label', { for: id }, def.label),
      control,
      def.hint ? h('p', { class: 'hint', id: hintId }, def.hint) : null,
      guard,
    );
  }

  #onSubmit(e: SubmitEvent): void {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const read = (key: string): string => String(data.get(key) ?? '');
    const title = this.root.querySelector<HTMLInputElement>('#entry-title');
    const summary = this.root.querySelector<HTMLElement>('#guard-summary');
    const save = this.root.querySelector<HTMLButtonElement>('#entry-save');

    if (!read('title').trim()) {
      title?.setAttribute('aria-invalid', 'true');
      summary?.replaceChildren(icon('alert'), 'Give this entry a name.');
      title?.focus();
      return;
    }

    const flagged = this.root.querySelectorAll('[aria-invalid="true"]').length;
    if (flagged > 0 && !this.#confirmedRisk) {
      this.#confirmedRisk = true;
      summary?.replaceChildren(icon('alert'), `${flagged === 1 ? 'One field looks' : `${flagged} fields look`} sensitive. Edit it, or save anyway.`);
      if (save) save.textContent = 'Save anyway';
      this.root.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    const fields: Record<string, string> = {};
    for (const f of getCategory(this.#category).fields) fields[f.key] = read(f.key);
    const priority = read('priority') as Priority;
    const draft: EntryDraft = {
      ...(this.#entry ? { id: this.#entry.id } : {}),
      category: this.#category,
      title: read('title'),
      priority: PRIORITIES.includes(priority) ? priority : 'first-month',
      fields,
      notes: read('notes'),
    };
    store.update((vault) => upsertEntry(vault, draft).vault);
    announce(this.#entry ? 'Changes saved' : 'Added to your locker');
    this.#close();
  }

  #onClosed(): void {
    restoreFocus(this.#restoreFocus);
    this.#restoreFocus = null;
  }
}

customElements.define('ll-entry-editor', EntryEditorElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-entry-editor': EntryEditorElement;
  }
}
