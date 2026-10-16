// Domain types for the locker. Pure data — no DOM, no crypto.

export const CATEGORY_IDS = [
  'estate',
  'life-insurance',
  'banking',
  'investments',
  'property',
  'insurance',
  'debts',
  'benefits',
  'digital',
  'contacts',
  'household',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const PRIORITIES = ['first-week', 'first-month', 'when-ready'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type TextFieldKind = 'text' | 'textarea' | 'tel' | 'email' | 'url' | 'date' | 'currency' | 'last4';

interface FieldBase {
  readonly key: string;
  readonly label: string;
  readonly hint?: string;
  /** Spans both columns in the editor grid. */
  readonly wide?: boolean;
  /** Shown on the entry card summary line. */
  readonly summary?: boolean;
}

export type FieldDef =
  | (FieldBase & { readonly kind: TextFieldKind })
  | (FieldBase & { readonly kind: 'select'; readonly options: readonly string[] });

export interface CategoryDef {
  readonly id: CategoryId;
  readonly label: string;
  /** Lower-case noun used in "Add a …" buttons. */
  readonly singular: string;
  readonly description: string;
  /** Shown in the empty state: what a good entry holds. */
  readonly prompt: string;
  readonly icon: IconName;
  readonly fields: readonly FieldDef[];
}

export type IconName =
  | 'estate'
  | 'life-insurance'
  | 'banking'
  | 'investments'
  | 'property'
  | 'insurance'
  | 'debts'
  | 'benefits'
  | 'digital'
  | 'contacts'
  | 'household'
  | 'overview'
  | 'guide'
  | 'settings'
  | 'lock'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'print'
  | 'external'
  | 'check'
  | 'alert'
  | 'eye'
  | 'eye-off'
  | 'close';

export interface Entry {
  readonly id: string;
  readonly category: CategoryId;
  readonly title: string;
  readonly priority: Priority;
  readonly fields: Readonly<Record<string, string>>;
  /** Plain-language instructions for whoever handles this. */
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Profile {
  readonly ownerName: string;
  /** A personal letter shown first in the family guide. */
  readonly letter: string;
}

export interface Settings {
  readonly autoLockMinutes: number;
  /** Stored in plaintext inside the .locker file so family can find the passphrase. */
  readonly passphraseHint: string;
}

export interface Vault {
  readonly version: 1;
  readonly profile: Profile;
  readonly settings: Settings;
  readonly entries: readonly Entry[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Set when a .locker backup is downloaded; drives the "backup is stale" nudge. */
  readonly lastExportedAt: string | null;
}

export type EntryDraft = Pick<Entry, 'category' | 'title' | 'priority' | 'fields' | 'notes'> & {
  readonly id?: string;
};
