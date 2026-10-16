// <ll-shell>: the unlocked app. Header, mode banner, section index, routed page.
import type { Route } from '../core/router.ts';
import { parseRoute, sameRoute } from '../core/router.ts';
import type { Mode } from '../core/store.ts';
import type { Vault } from '../core/types.ts';
import { isBackupStale, removeEntry } from '../core/vault.ts';
import type { Command } from '../ui/commands.ts';
import { COMMAND_EVENT } from '../ui/commands.ts';
import { currentVault, saveBlob, store } from '../ui/context.ts';
import { h } from '../ui/dom.ts';
import { LockerElement } from '../ui/element.ts';
import { icon } from '../ui/icons.ts';
import { CategoryElement } from './category.ts';
import { confirmAction } from './confirm.ts';
import { EntryEditorElement } from './entry-editor.ts';
import { GuideElement } from './guide.ts';
import { renderNav } from './nav.ts';
import { OverviewElement } from './overview.ts';
import { SettingsElement } from './settings.ts';
import { shellStyles } from './shell.styles.ts';
import { announce } from './toast.ts';

type View = OverviewElement | CategoryElement | GuideElement | SettingsElement;

export class ShellElement extends LockerElement {
  #route: Route = parseRoute(location.hash);
  #view: View | null = null;
  #unsubscribe: (() => void) | null = null;
  readonly #editor = new EntryEditorElement();
  readonly #bar = h('header', { class: 'bar' });
  readonly #banner = h('div', { class: 'banner', role: 'status' });
  readonly #navSlot = h('div', { class: 'nav-slot' });
  readonly #page = h('div', { class: 'page' });

  constructor() {
    super(shellStyles);
    this.addEventListener(COMMAND_EVENT, (e) => void this.#onCommand(e.detail));
  }

  connectedCallback(): void {
    window.addEventListener('hashchange', this.#onHashChange);
    this.#unsubscribe = store.subscribe(() => this.requestRender());
    this.root.replaceChildren(this.render());
    this.renderNow();
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.#onHashChange);
    this.#unsubscribe?.();
  }

  /** Static frame, built once. renderNow() below only refreshes the dynamic parts. */
  protected render(): Node {
    const skip = h('button', { type: 'button', class: 'btn btn-primary skip', on: { click: () => this.#view?.focusHeading() } }, 'Skip to content');
    return h(
      'div',
      { class: 'frame' },
      skip,
      this.#bar,
      this.#banner,
      h('div', { class: 'body' }, this.#navSlot, h('main', { id: 'main' }, this.#page)),
      this.#editor,
    );
  }

  protected override renderNow(): void {
    const state = store.state;
    if (state.status !== 'unlocked') return;
    this.#renderBar(state.vault, state.mode);
    this.#renderBanner(state.mode, state.durable);
    const focusKey = (this.root.activeElement as HTMLElement | null)?.dataset['focus'];
    this.#navSlot.replaceChildren(renderNav(state.vault, this.#route));
    if (focusKey?.startsWith('nav-')) this.root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus();
    this.#mountView();
  }

  #renderBar(vault: Vault, mode: Mode): void {
    const stale = mode !== 'demo' && vault.entries.length > 0 && isBackupStale(vault);
    const exportBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-quiet',
        'data-focus': 'bar-export',
        title: stale ? 'You have changes since your last backup' : null,
        on: { click: () => void this.#onCommand({ type: 'export' }) },
      },
      icon('download'),
      h('span', { class: 'label' }, 'Download backup'),
      stale ? h('span', { class: 'dot' }) : null,
      stale ? h('span', { class: 'vh' }, ' (changes since last backup)') : null,
    );
    const lockBtn = h(
      'button',
      { type: 'button', class: 'btn', 'data-focus': 'bar-lock', on: { click: () => void this.#onCommand({ type: 'lock' }) } },
      icon('lock'),
      h('span', { class: 'label' }, mode === 'demo' ? 'Leave sample' : 'Lock'),
    );
    this.#bar.replaceChildren(
      h(
        'div',
        { class: 'bar-start' },
        h('a', { class: 'brand', href: '#overview' }, icon('lock'), 'Life Locker'),
        vault.profile.ownerName ? h('span', { class: 'owner' }, vault.profile.ownerName) : null,
      ),
      h('div', { class: 'bar-actions' }, mode === 'demo' ? null : exportBtn, lockBtn),
    );
  }

  #renderBanner(mode: Mode, durable: boolean): void {
    const action = (label: string, run: () => void): HTMLButtonElement => h('button', { type: 'button', class: 'btn', on: { click: run } }, label);
    this.#banner.className = 'banner';
    if (mode === 'demo') {
      this.#banner.replaceChildren(
        h('p', null, 'You’re looking at sample data for a fictional person. Nothing you change here is saved.'),
        action('Start my own locker', () => void store.lock().then(() => store.showSetup())),
      );
    } else if (mode === 'copy') {
      this.#banner.replaceChildren(
        h('p', null, 'You opened a copy. Changes stay in this tab and are not saved on this device.'),
        action('Keep on this device', () => void store.keepOnDevice().then(() => announce('Saved on this device'))),
      );
    } else if (!durable) {
      this.#banner.classList.add('warn');
      this.#banner.replaceChildren(h('p', null, 'This browser isn’t keeping saved data (private window or blocked storage). Download a backup before you close it.'));
    } else {
      this.#banner.replaceChildren();
    }
  }

  #mountView(): void {
    const route = this.#route;
    let view: View;
    switch (route.name) {
      case 'overview':
        view = this.#view instanceof OverviewElement ? this.#view : new OverviewElement();
        break;
      case 'guide':
        view = this.#view instanceof GuideElement ? this.#view : new GuideElement();
        break;
      case 'settings':
        view = this.#view instanceof SettingsElement ? this.#view : new SettingsElement();
        break;
      case 'category':
        view = this.#view instanceof CategoryElement ? this.#view : new CategoryElement();
        view.category = route.id;
        break;
    }
    if (view !== this.#view) {
      this.#view = view;
      this.#page.replaceChildren(view);
    }
  }

  #onHashChange = (): void => {
    const next = parseRoute(location.hash);
    if (sameRoute(next, this.#route)) return;
    this.#route = next;
    this.renderNow();
    // In the narrow strip the active tab may sit off-screen.
    this.root.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => this.#view?.focusHeading());
  };

  async #onCommand(command: Command): Promise<void> {
    const vault = currentVault();
    switch (command.type) {
      case 'edit-entry': {
        const entry = command.entryId ? (vault?.entries.find((e) => e.id === command.entryId) ?? null) : null;
        this.#editor.open(command.category, entry);
        break;
      }
      case 'delete-entry': {
        const entry = vault?.entries.find((e) => e.id === command.entryId);
        if (!entry) return;
        const ok = await confirmAction({
          title: `Delete “${entry.title}”?`,
          body: 'It is removed from this locker. Older .locker backups still contain it.',
          confirmLabel: 'Delete',
          tone: 'danger',
        });
        if (!ok) return;
        store.update((v) => removeEntry(v, entry.id));
        announce(`Deleted ${entry.title}`);
        requestAnimationFrame(() => this.#view?.focusHeading());
        break;
      }
      case 'export': {
        try {
          const { blob, fileName } = await store.exportFile();
          saveBlob(blob, fileName);
          announce(`Downloaded ${fileName}`);
        } catch (error) {
          announce(error instanceof Error ? error.message : 'The backup could not be created.', 'error');
        }
        break;
      }
      case 'lock':
        await store.lock();
        break;
    }
  }
}

customElements.define('ll-shell', ShellElement);

declare global {
  interface HTMLElementTagNameMap {
    'll-shell': ShellElement;
  }
}
