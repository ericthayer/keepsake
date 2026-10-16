// Example locker for the "Explore with sample data" path. All names are fictional.
import type { EntryDraft, Vault } from './types.ts';
import { createVault, updateProfile, upsertEntry } from './vault.ts';

const SAMPLE_ENTRIES: readonly EntryDraft[] = [
  {
    category: 'estate',
    title: 'Last will and testament',
    priority: 'first-week',
    fields: {
      docType: 'Will',
      dateSigned: '2024-03-12',
      preparer: 'Okafor & Lind, Attorneys',
      phone: '(555) 014-2290',
      executor: 'Sam Avery (brother)',
      original: 'Fireproof box, hall closet, top shelf. A copy is with Okafor & Lind.',
    },
    notes: 'Call Dana Okafor first. She has the codicil from 2025 and knows the trust is separate.',
  },
  {
    category: 'contacts',
    title: 'Sam Avery',
    priority: 'first-week',
    fields: { role: 'Executor', phone: '(555) 013-8841', email: 'sam.avery@example.com' },
    notes: 'Sam has agreed to serve and has a spare house key.',
  },
  {
    category: 'contacts',
    title: 'Dana Okafor',
    priority: 'first-week',
    fields: { role: 'Attorney', organization: 'Okafor & Lind', phone: '(555) 014-2290' },
    notes: '',
  },
  {
    category: 'life-insurance',
    title: 'Term life policy',
    priority: 'first-month',
    fields: {
      institution: 'Harborview Mutual Life',
      policyType: 'Term',
      ref: '4417',
      coverage: '$500,000',
      beneficiaries: 'Morgan Avery 100%',
      phone: '(555) 019-6600',
      docLocation: 'Fireproof box, blue folder',
    },
    notes: 'Claim needs a certified death certificate and the claim form from their website.',
  },
  {
    category: 'life-insurance',
    title: 'Group life through work',
    priority: 'first-month',
    fields: { institution: 'Through employer (Northline Design)', policyType: 'Group (through employer)', coverage: '2× salary' },
    notes: 'Start with HR. This one is easy to forget.',
  },
  {
    category: 'banking',
    title: 'Joint checking',
    priority: 'first-week',
    fields: {
      institution: 'First Cedar Bank',
      accountType: 'Checking',
      ref: '0932',
      ownership: 'Joint',
      beneficiaries: 'Morgan Avery (joint owner)',
      phone: '(555) 017-3000',
      access: 'Shared family vault in the password manager',
    },
    notes: 'Mortgage and utilities draft from here. Keep at least $4,000 in it.',
  },
  {
    category: 'investments',
    title: 'Roth IRA',
    priority: 'first-month',
    fields: {
      institution: 'Northpoint Brokerage',
      accountType: 'Roth IRA',
      ref: '7710',
      beneficiaries: 'Morgan Avery primary, children contingent',
      phone: '(555) 016-4400',
    },
    notes: 'Do not cash it out. Ask about an inherited IRA.',
  },
  {
    category: 'property',
    title: 'Home on Linden Street',
    priority: 'first-month',
    fields: {
      assetType: 'Primary home',
      address: '42 Linden Street',
      lender: 'Keystone Home Loans',
      ref: '2051',
      payment: 'First Cedar joint checking, 1st of the month',
      docLocation: 'Deed copy in the fireproof box. Original recorded with the county.',
    },
    notes: 'Mortgage is on autopay. Call the servicer before it lapses.',
  },
  {
    category: 'digital',
    title: 'Mobile phone',
    priority: 'first-week',
    fields: {
      accountType: 'Mobile phone carrier',
      institution: 'Brightwave Wireless',
      wish: 'Keep active',
      access: 'Account PIN is in the password manager',
    },
    notes: 'Keep this line on for at least six months. Two-factor codes come here.',
  },
  {
    category: 'household',
    title: 'Biscuit (dog)',
    priority: 'first-week',
    fields: { itemType: 'Pets', contact: 'Priya Nair, next door', phone: '(555) 012-7719' },
    notes: 'Priya has agreed to take Biscuit. Vet records are in the kitchen drawer.',
  },
];

export function createSampleVault(): Vault {
  let vault = updateProfile(createVault('Jordan Avery', 'Written on the card in the fireproof box'), {
    letter:
      'If you are reading this, start with Sam. He knows where the will is and has agreed to handle things.\n\n' +
      'Nothing here needs to happen fast except the first-week list. Take your time with the rest.',
  });
  for (const draft of SAMPLE_ENTRIES) vault = upsertEntry(vault, draft).vault;
  return vault;
}
