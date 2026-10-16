// Shared component styles adopted by every shadow root: type, controls, chips, utilities.
import { css } from './css.ts';

export const shared = css`
  :host {
    display: block;
    color: var(--ink);
    font-family: var(--font-ui);
  }
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }

  h1, h2, h3 { margin: 0; text-wrap: balance; color: var(--ink); }
  h1 {
    font: 400 var(--step-4) / 1.08 var(--font-display);
    letter-spacing: -0.01em;
  }
  h1:focus { outline: none; }
  h2 { font-size: var(--step-1); font-weight: 650; line-height: 1.3; }
  h3 { font-size: var(--step-0); font-weight: 650; line-height: 1.35; }
  p { margin: 0; max-width: var(--measure); text-wrap: pretty; }
  a { color: var(--signature); text-underline-offset: 0.18em; text-decoration-thickness: 1px; }
  a:hover { text-decoration-thickness: 2px; }

  .eyebrow {
    font-size: var(--step--1);
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .muted { color: var(--ink-2); }
  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .vh {
    position: absolute !important;
    width: 1px; height: 1px;
    margin: -1px; padding: 0; border: 0;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap;
  }
  .icon { width: 1.25em; height: 1.25em; flex: none; }

  :focus-visible {
    outline: 2px solid var(--signature);
    outline-offset: 2px;
    border-radius: var(--radius-1);
  }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius-1);
    background: var(--page);
    color: var(--ink);
    font: 600 var(--step--1) / 1.2 var(--font-ui);
    letter-spacing: 0.01em;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
  }
  .btn:hover { background: var(--paper); border-color: var(--ink-3); }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-primary { background: var(--signature); border-color: var(--signature); color: var(--signature-ink); }
  .btn-primary:hover { background: var(--signature); border-color: var(--ink); }
  .btn-quiet { border-color: transparent; background: transparent; color: var(--ink-2); }
  .btn-quiet:hover { background: var(--signature-soft); border-color: transparent; color: var(--ink); }
  .btn-danger { color: var(--danger); border-color: var(--danger); }
  .btn-danger:hover { background: var(--danger-soft); border-color: var(--danger); }
  .btn-danger.solid { background: var(--danger); color: var(--page); }
  .btn-icon { min-width: 2.75rem; padding-inline: var(--space-2); }
  .btn[aria-busy='true'] { cursor: progress; }

  /* Fields */
  .field { display: grid; gap: var(--space-1); align-content: start; min-width: 0; }
  .field > label, .label { font-size: var(--step--1); font-weight: 650; color: var(--ink); }
  .hint { font-size: var(--step--1); color: var(--ink-2); line-height: 1.45; }
  input, select, textarea {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius-1);
    background: var(--page);
    color: var(--ink);
    font: 400 var(--step-0) / 1.4 var(--font-ui);
  }
  textarea { resize: vertical; min-height: 6rem; line-height: var(--leading); }
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--signature); outline-offset: 0; border-color: var(--signature);
  }
  input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: var(--warn); }
  .warning, .error {
    display: flex; gap: var(--space-2); align-items: flex-start;
    font-size: var(--step--1); line-height: 1.45;
  }
  .warning { color: var(--warn); }
  .error { color: var(--danger); }
  .warning .icon, .error .icon { margin-top: 0.1em; }

  /* Chips */
  .chip {
    display: inline-flex; align-items: center; gap: var(--space-1);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.8125rem; font-weight: 650; line-height: 1.5;
    white-space: nowrap;
    background: var(--paper); color: var(--ink-2);
  }
  .chip-first-week { background: var(--warn-soft); color: var(--warn); }
  .chip-first-month { background: var(--signature-soft); color: var(--signature); }
  .chip-ok { background: var(--ok-soft); color: var(--ok); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  }
`;
