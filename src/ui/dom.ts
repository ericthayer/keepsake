// Safe DOM construction. Strings always become text nodes; nothing is parsed as HTML.

export type Child = Node | string | number | null | undefined | false | readonly Child[];
type AttrValue = string | number | boolean | null | undefined;
type Listeners = { readonly [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void };

export interface Props {
  readonly on?: Listeners;
  readonly [attr: string]: AttrValue | Listeners;
}

function append(parent: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    for (const c of child as readonly Child[]) append(parent, c);
    return;
  }
  parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [name, value] of Object.entries(props)) {
      if (name === 'on') {
        for (const [type, listener] of Object.entries(value as Listeners)) {
          if (listener) el.addEventListener(type, listener as EventListener);
        }
      } else if (value === true) {
        el.setAttribute(name, '');
      } else if (value !== false && value !== null && value !== undefined) {
        el.setAttribute(name, String(value));
      }
    }
  }
  for (const child of children) append(el, child);
  return el;
}

/** Visually hidden text for screen readers. */
export function vh(text: string): HTMLSpanElement {
  return h('span', { class: 'vh' }, text);
}

/** The focused element, looking through open shadow roots. */
export function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function findByFocusKey(root: Document | ShadowRoot, key: string): HTMLElement | null {
  const hit = root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(key)}"]`);
  if (hit) return hit;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      const found = findByFocusKey(el.shadowRoot, key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Returns focus to `target`, or, if a re-render replaced it, to its successor with the
 * same data-focus key. Waits a frame so batched renders land first.
 */
export function restoreFocus(target: Element | null): void {
  if (!(target instanceof HTMLElement)) return;
  const key = target.dataset['focus'];
  requestAnimationFrame(() => {
    if (target.isConnected) target.focus();
    else if (key) findByFocusKey(document, key)?.focus();
  });
}
