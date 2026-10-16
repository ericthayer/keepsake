// Hash routes are bare tokens (#overview, #banking) so deep links survive any host.
import type { CategoryId } from './types.ts';
import { isCategoryId } from './schema.ts';

export type Route =
  | { readonly name: 'overview' }
  | { readonly name: 'category'; readonly id: CategoryId }
  | { readonly name: 'guide' }
  | { readonly name: 'settings' };

export function parseRoute(hash: string): Route {
  const token = hash.replace(/^#/, '');
  if (token === 'guide') return { name: 'guide' };
  if (token === 'settings') return { name: 'settings' };
  if (isCategoryId(token)) return { name: 'category', id: token };
  return { name: 'overview' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'overview':
      return '#overview';
    case 'category':
      return `#${route.id}`;
    case 'guide':
      return '#guide';
    case 'settings':
      return '#settings';
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return routeHref(a) === routeHref(b);
}
