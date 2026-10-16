import { css } from '../styles/css.ts';

export const shellStyles = css`
  :host { container-type: inline-size; min-height: 100dvh; animation: open 260ms var(--ease); }
  @keyframes open { from { opacity: 0; } }

  .skip { position: absolute; left: var(--space-4); top: -4rem; z-index: 30; }
  .skip:focus { top: var(--space-2); }

  .bar {
    position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4);
    padding-block: var(--space-3);
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
  }
  .bar-start { display: flex; align-items: center; gap: var(--space-4); min-width: 0; }
  .brand { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--ink); text-decoration: none; font: 400 var(--step-1) / 1 var(--font-display); }
  .brand .icon { color: var(--signature); }
  .owner { color: var(--ink-2); font-size: var(--step--1); padding-left: var(--space-4); border-left: 1px solid var(--rule-strong); }
  .bar-actions { display: flex; gap: var(--space-1); margin-left: auto; }
  .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--warn); }

  .banner {
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4);
    padding-block: var(--space-3);
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    background: var(--signature-soft);
    border-bottom: 1px solid var(--rule);
  }
  .banner.warn { background: var(--warn-soft); }
  .banner p { flex: 1 1 20rem; }
  .banner:empty { display: none; }

  .body { display: grid; grid-template-columns: minmax(0, 1fr); }
  .nav-slot, nav { min-width: 0; }
  nav ul { list-style: none; margin: 0; padding: 0; }
  .tab {
    display: flex; align-items: center; gap: var(--space-3);
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    color: var(--ink-2);
    text-decoration: none;
    font-size: var(--step--1); font-weight: 600;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .tab:hover { color: var(--ink); }
  .tab[aria-current='page'] { color: var(--ink); background: var(--page); border-color: var(--rule); }
  .tab .icon { color: var(--ink-3); }
  .tab[aria-current='page'] .icon { color: var(--signature); }
  .tab .count { margin-left: auto; font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink-3); font-weight: 400; }
  .group-label { padding: var(--space-4) var(--space-3) var(--space-1); }

  main {
    min-width: 0;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    background: var(--page);
  }
  .page { max-width: 64rem; }

  /* Narrow: the index becomes a scrolling strip of tabs above the page. */
  @container (max-width: 59.99rem) {
    nav { overflow-x: auto; border-bottom: 1px solid var(--rule); scrollbar-width: thin; }
    nav > ul { display: flex; padding-inline: max(12px, env(safe-area-inset-left, 0px)); }
    nav ul ul, nav .group { display: contents; }
    .group-label { display: none; }
    .tab { border-bottom: none; margin-bottom: -1px; border-radius: var(--radius-1) var(--radius-1) 0 0; }
    .tab .count { display: none; }
    .tab[aria-current='page'] { border-bottom: 1px solid var(--page); }
    .owner { display: none; }
  }
  @container (max-width: 34rem) {
    .bar-actions .label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  }

  /* Wide: a tabbed index on the left; the active tab joins the page. */
  @container (min-width: 60rem) {
    .body { grid-template-columns: var(--rail) minmax(0, 1fr); min-height: calc(100dvh - 4rem); }
    nav { padding: var(--space-5) 0 var(--space-6) var(--space-4); }
    nav > ul { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 5rem); }
    .tab { border-right: none; border-radius: var(--radius-1) 0 0 var(--radius-1); margin-right: -1px; }
    main { border-left: 1px solid var(--rule); padding-left: var(--space-7); padding-right: var(--space-7); }
  }

  @media print {
    .bar, nav, .banner, .skip { display: none !important; }
    main { border: none; padding: 0; }
    .body { display: block; }
  }
`;
