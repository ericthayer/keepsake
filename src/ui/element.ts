// Base class for locker components: shadow root, shared styles, batched re-render
// that keeps keyboard focus on the element with the same data-focus key.
import { shared } from '../styles/shared.ts';

export abstract class LockerElement extends HTMLElement {
  protected readonly root: ShadowRoot;
  #frame = 0;

  constructor(...sheets: CSSStyleSheet[]) {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.adoptedStyleSheets = [shared, ...sheets];
  }

  protected abstract render(): Node;

  /** Schedules one render per animation frame, however many changes arrive. */
  protected requestRender(): void {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.renderNow();
    });
  }

  protected renderNow(): void {
    if (this.#frame) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
    const active = this.root.activeElement;
    const key = active instanceof HTMLElement ? active.dataset['focus'] : undefined;
    this.root.replaceChildren(this.render());
    if (key) this.root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(key)}"]`)?.focus();
  }

  /** Moves focus to the view heading after navigation, for screen reader users. */
  focusHeading(): void {
    this.root.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }
}
