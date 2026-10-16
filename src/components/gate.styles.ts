import { css } from '../styles/css.ts';

export const gateStyles = css`
  :host {
    container-type: inline-size;
    min-height: 100dvh;
    padding-block: var(--space-7);
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  .gate {
    display: grid;
    gap: var(--space-7);
    max-width: 68rem;
    margin-inline: auto;
    align-items: start;
    animation: settle 320ms var(--ease);
  }
  @container (min-width: 52rem) {
    .gate { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--space-8); padding-top: var(--space-7); }
  }
  @keyframes settle { from { opacity: 0; transform: translateY(10px); } }

  .intro { display: grid; gap: var(--space-5); min-width: 0; }
  .brand {
    display: flex; align-items: center; gap: var(--space-2);
    font: 400 var(--step-1) / 1 var(--font-display);
    color: var(--ink);
  }
  .brand .icon { color: var(--signature); }
  .intro h1 { font-size: var(--step-5); max-width: 14ch; }
  .lede { font-size: var(--step-1); line-height: 1.5; color: var(--ink-2); max-width: 34rem; }

  .facts { list-style: none; margin: 0; padding: 0; display: grid; border-top: 1px solid var(--rule); max-width: 34rem; }
  .facts li {
    display: grid; grid-template-columns: auto 1fr; gap: var(--space-3);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--rule);
    color: var(--ink-2);
  }
  .facts .icon { color: var(--signature); margin-top: 0.15em; }
  .facts strong { color: var(--ink); font-weight: 650; }

  .panel {
    display: grid; gap: var(--space-5);
    min-width: 0;
    padding: var(--space-6);
    border: 1px solid var(--rule);
    border-radius: var(--radius-2);
    background: var(--page);
  }
  @container (max-width: 30rem) { .panel { padding: var(--space-5); } }
  .panel h2 { font: 400 var(--step-3) / 1.15 var(--font-display); }
  form { display: grid; gap: var(--space-4); }

  .hint-card {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-1);
    background: var(--signature-soft);
    color: var(--ink);
  }
  .hint-card .label { display: block; color: var(--ink-2); }
  .caution {
    display: flex; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius-1);
    font-size: var(--step--1);
    color: var(--ink-2);
  }
  .caution .icon { color: var(--warn); margin-top: 0.1em; }

  .submit { width: 100%; min-height: 3rem; font-size: var(--step-0); }
  .alt { list-style: none; margin: 0; padding: var(--space-4) 0 0; border-top: 1px solid var(--rule); display: grid; gap: var(--space-1); }
  .alt .btn { justify-content: flex-start; width: 100%; color: var(--signature); }
  .error-slot:empty { display: none; }
`;
