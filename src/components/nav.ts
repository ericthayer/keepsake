// The section index: overview, eleven categories with counts, guide, settings.
import type { Route } from '../core/router.ts';
import { routeHref, sameRoute } from '../core/router.ts';
import { CATEGORIES } from '../core/schema.ts';
import type { IconName, Vault } from '../core/types.ts';
import { h } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';

function tab(route: Route, current: Route, label: string, iconName: IconName, count?: number): HTMLLIElement {
  return h(
    'li',
    null,
    h(
      'a',
      { class: 'tab', href: routeHref(route), 'aria-current': sameRoute(route, current) ? 'page' : null, 'data-focus': `nav-${routeHref(route)}` },
      icon(iconName),
      label,
      !count ? null : h('span', { class: 'count', 'aria-label': `${count} ${count === 1 ? 'entry' : 'entries'}` }, String(count)),
    ),
  );
}

export function renderNav(vault: Vault, current: Route): HTMLElement {
  const counts = new Map<string, number>();
  for (const e of vault.entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);

  return h(
    'nav',
    { 'aria-label': 'Locker sections' },
    h(
      'ul',
      null,
      tab({ name: 'overview' }, current, 'Overview', 'overview'),
      tab({ name: 'guide' }, current, 'Family guide', 'guide'),
      h(
        'li',
        { class: 'group' },
        h('p', { class: 'eyebrow group-label', id: 'nav-sections' }, 'Sections'),
        h(
          'ul',
          { 'aria-labelledby': 'nav-sections' },
          CATEGORIES.map((c) => tab({ name: 'category', id: c.id }, current, c.label, c.icon, counts.get(c.id) ?? 0)),
        ),
      ),
      tab({ name: 'settings' }, current, 'Settings', 'settings'),
    ),
  );
}
