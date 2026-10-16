// App-level commands bubble out of shadow roots as one typed event.
import type { CategoryId } from '../core/types.ts';

export type Command =
  | { readonly type: 'edit-entry'; readonly category: CategoryId; readonly entryId: string | null }
  | { readonly type: 'delete-entry'; readonly entryId: string }
  | { readonly type: 'export' }
  | { readonly type: 'lock' };

export const COMMAND_EVENT = 'll-command';

declare global {
  interface HTMLElementEventMap {
    'll-command': CustomEvent<Command>;
  }
}

export function dispatchCommand(from: EventTarget, command: Command): void {
  from.dispatchEvent(new CustomEvent<Command>(COMMAND_EVENT, { detail: command, bubbles: true, composed: true }));
}
