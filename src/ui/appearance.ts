import { h } from './dom.ts';

export type Appearance = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'life-locker.appearance';
const controls = new Set<HTMLSelectElement>();
let nextControlId = 0;

function validAppearance(value: string | null): Appearance {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function getAppearance(): Appearance {
  try { return validAppearance(localStorage.getItem(STORAGE_KEY)); }
  catch { return 'system'; }
}

function applyAppearance(value: Appearance): void {
  document.documentElement.dataset.theme = value;
  for (const control of controls) {
    if (!control.isConnected) controls.delete(control);
    else control.value = value;
  }
}

export function setAppearance(value: Appearance): void {
  const preference = validAppearance(value);
  try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* Apply for this page even if storage is blocked. */ }
  applyAppearance(preference);
}

export function appearanceControl(): HTMLElement {
  const id = `appearance-${++nextControlId}`;
  let select: HTMLSelectElement;
  select = h('select', {
    id,
    class: 'appearance-select',
    'aria-label': 'Color theme',
    'data-appearance-control': '',
    on: { change: () => setAppearance(validAppearance(select.value)) },
  },
  h('option', { value: 'system' }, 'System'),
  h('option', { value: 'light' }, 'Light'),
  h('option', { value: 'dark' }, 'Dark'));
  controls.add(select);
  select.value = getAppearance();
  return h('div', { class: 'appearance-control' }, h('label', { for: id }, 'Appearance'), select);
}

function syncAppearance(event?: StorageEvent): void {
  if (event && event.key !== null && event.key !== STORAGE_KEY) return;
  applyAppearance(getAppearance());
}

window.addEventListener('storage', syncAppearance);
window.addEventListener('pageshow', () => syncAppearance());
