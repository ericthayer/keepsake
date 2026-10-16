// App-wide singletons. Components import these instead of threading props.
import { openEnvelopeStore } from '../core/persistence.ts';
import { VaultStore } from '../core/store.ts';
import type { Vault } from '../core/types.ts';

export const store = new VaultStore(await openEnvelopeStore());

export function currentVault(): Vault | null {
  const state = store.state;
  return state.status === 'unlocked' ? state.vault : null;
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Locks after a period with no pointer or keyboard activity. Returns a stop function. */
export function startIdleLock(minutes: () => number, onIdle: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = (): void => {
    clearTimeout(timer);
    timer = setTimeout(onIdle, minutes() * 60_000);
  };
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  for (const type of events) window.addEventListener(type, reset, { passive: true });
  reset();
  return () => {
    clearTimeout(timer);
    for (const type of events) window.removeEventListener(type, reset);
  };
}
