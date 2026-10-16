// Layout shared by routed views: page header, sections, empty states.
import { css } from './css.ts';

export const viewStyles = css`
  :host { container-type: inline-size; }
  .view { display: grid; gap: var(--space-7); padding-block: var(--space-6) var(--space-8); }
  .page-head { display: grid; gap: var(--space-3); }
  .page-head .muted { font-size: var(--step-0); }
  .page-head .row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-top: var(--space-2); }
  section { display: grid; gap: var(--space-4); min-width: 0; }
  .section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-2) var(--space-4); }
  .section-head p { color: var(--ink-2); }
  .ruled { border-top: 2px solid var(--ink); padding-top: var(--space-4); }

  .empty {
    display: grid; gap: var(--space-4); justify-items: start;
    padding: var(--space-6);
    border: 1px dashed var(--rule-strong);
    border-radius: var(--radius-2);
  }
  .empty .icon { width: 2rem; height: 2rem; color: var(--signature); }
  .empty ul { margin: 0; padding-left: 1.2em; color: var(--ink-2); columns: 2 14rem; }

  @media print {
    .view { padding: 0; gap: 18pt; }
    .no-print { display: none !important; }
  }
`;
