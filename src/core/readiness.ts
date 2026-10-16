// Readiness: the handful of things a family most often cannot find.
import type { CategoryId, Vault } from './types.ts';
import { isBackupStale } from './vault.ts';

export interface ReadinessItem {
  readonly id: string;
  readonly label: string;
  readonly why: string;
  readonly done: boolean;
  /** Where to go to complete it. */
  readonly target: CategoryId | 'settings';
}

const has = (vault: Vault, category: CategoryId, key?: string, values?: readonly string[]): boolean =>
  vault.entries.some((e) => {
    if (e.category !== category) return false;
    if (!key || !values) return true;
    const value = e.fields[key];
    return value !== undefined && values.includes(value);
  });

export function assessReadiness(vault: Vault): ReadinessItem[] {
  const executorNamed =
    has(vault, 'contacts', 'role', ['Executor', 'Successor trustee']) ||
    vault.entries.some((e) => e.category === 'estate' && Boolean(e.fields['executor']));

  return [
    {
      id: 'letter',
      label: 'Write a short letter to your family',
      why: 'It is the first thing they read. A few lines of where to start helps more than you expect.',
      done: vault.profile.letter.trim().length > 0,
      target: 'settings',
    },
    {
      id: 'will',
      label: 'Record where your will or trust is',
      why: 'Courts usually need the signed original, not a copy.',
      done: has(vault, 'estate', 'docType', ['Will', 'Revocable living trust']),
      target: 'estate',
    },
    {
      id: 'executor',
      label: 'Name your executor',
      why: 'Everyone else waits on this person.',
      done: executorNamed,
      target: 'contacts',
    },
    {
      id: 'life-insurance',
      label: 'List life insurance, including through work',
      why: 'Unclaimed policies are common because nobody knew they existed.',
      done: has(vault, 'life-insurance'),
      target: 'life-insurance',
    },
    {
      id: 'banking',
      label: 'List your bank accounts',
      why: 'Bills keep drafting from them. Family needs to know which ones are joint.',
      done: has(vault, 'banking'),
      target: 'banking',
    },
    {
      id: 'investments',
      label: 'List investment and retirement accounts',
      why: 'Beneficiary designations override the will, so they need checking.',
      done: has(vault, 'investments'),
      target: 'investments',
    },
    {
      id: 'phone-email',
      label: 'Record your phone carrier and primary email',
      why: 'Verification codes go there. Closing them early locks family out of everything.',
      done: has(vault, 'digital', 'accountType', ['Mobile phone carrier', 'Primary email']),
      target: 'digital',
    },
    {
      id: 'backup',
      label: 'Download a current backup',
      why: 'Your family opens the .locker file, not this browser. Keep it with your will.',
      done: vault.entries.length > 0 && !isBackupStale(vault),
      target: 'settings',
    },
  ];
}
