import type { CategoryDef, CategoryId, FieldDef, Priority } from './types.ts';
import { CATEGORY_IDS, PRIORITIES } from './types.ts';

// Shared field definitions. Labels steer people toward pointers, not secrets.
const phone: FieldDef = { key: 'phone', label: 'Phone', kind: 'tel', summary: true };
const website: FieldDef = { key: 'website', label: 'Website', kind: 'url' };
const ref: FieldDef = {
  key: 'ref',
  label: 'Account number, last 4 only',
  kind: 'last4',
  hint: 'Enough for family to tell accounts apart. Never the full number.',
  summary: true,
};
const access: FieldDef = {
  key: 'access',
  label: 'Where the login is kept',
  kind: 'text',
  hint: 'For example "Family vault in 1Password". Never the password itself.',
  wide: true,
};
const docs: FieldDef = { key: 'docLocation', label: 'Where the paperwork is', kind: 'text', wide: true };

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'estate',
    label: 'Will & Legal',
    singular: 'legal document',
    description: 'Will, trusts, powers of attorney, and healthcare directives.',
    prompt: 'Record each document, who prepared it, and exactly where the signed original is.',
    icon: 'estate',
    fields: [
      {
        key: 'docType',
        label: 'Document',
        kind: 'select',
        summary: true,
        options: [
          'Will',
          'Revocable living trust',
          'Financial power of attorney',
          'Healthcare power of attorney',
          'Living will / advance directive',
          'Guardianship designation',
          'Safe deposit box',
          'Other',
        ],
      },
      { key: 'dateSigned', label: 'Date signed', kind: 'date' },
      { key: 'preparer', label: 'Prepared by (attorney or firm)', kind: 'text' },
      phone,
      { key: 'executor', label: 'Executor, trustee, or agent named', kind: 'text', wide: true },
      {
        key: 'original',
        label: 'Where the signed original is',
        kind: 'text',
        wide: true,
        hint: 'Copies are rarely accepted. Name the drawer, safe, or office.',
      },
    ],
  },
  {
    id: 'life-insurance',
    label: 'Life Insurance',
    singular: 'policy',
    description: 'Individual and employer life policies, and who is named on them.',
    prompt: 'List the insurer, the policy’s last 4 digits, the coverage amount, and the claims number.',
    icon: 'life-insurance',
    fields: [
      { key: 'institution', label: 'Insurer', kind: 'text', summary: true },
      {
        key: 'policyType',
        label: 'Policy type',
        kind: 'select',
        options: ['Term', 'Whole life', 'Universal', 'Group (through employer)', 'Accidental death', 'Other'],
      },
      { ...ref, label: 'Policy number, last 4 only' },
      { key: 'coverage', label: 'Coverage amount', kind: 'currency', summary: true },
      { key: 'beneficiaries', label: 'Named beneficiaries', kind: 'text', wide: true },
      { key: 'agent', label: 'Agent', kind: 'text' },
      { ...phone, label: 'Claims phone' },
      website,
      docs,
    ],
  },
  {
    id: 'banking',
    label: 'Banking',
    singular: 'bank account',
    description: 'Checking, savings, CDs, and who else is on each account.',
    prompt: 'Add the bank, account type, last 4 digits, and any joint owner or payable-on-death beneficiary.',
    icon: 'banking',
    fields: [
      { key: 'institution', label: 'Bank or credit union', kind: 'text', summary: true },
      {
        key: 'accountType',
        label: 'Account type',
        kind: 'select',
        options: ['Checking', 'Savings', 'Money market', 'Certificate of deposit', 'Business', 'Other'],
      },
      ref,
      {
        key: 'ownership',
        label: 'Ownership',
        kind: 'select',
        options: ['Individual', 'Joint', 'Payable on death (POD)', 'Owned by trust'],
      },
      { key: 'beneficiaries', label: 'Joint owner or POD beneficiary', kind: 'text', wide: true },
      phone,
      website,
      access,
    ],
  },
  {
    id: 'investments',
    label: 'Investments & Retirement',
    singular: 'account',
    description: 'Brokerage, 401(k), IRA, HSA, pensions, and annuities.',
    prompt: 'Add the custodian, account type, last 4 digits, and the beneficiary on file with them.',
    icon: 'investments',
    fields: [
      { key: 'institution', label: 'Custodian or brokerage', kind: 'text', summary: true },
      {
        key: 'accountType',
        label: 'Account type',
        kind: 'select',
        options: [
          '401(k)',
          '403(b)',
          'Traditional IRA',
          'Roth IRA',
          'Brokerage',
          'HSA',
          '529 plan',
          'Pension',
          'Annuity',
          'Crypto exchange',
          'Other',
        ],
      },
      ref,
      { key: 'value', label: 'Approximate value', kind: 'currency' },
      { key: 'beneficiaries', label: 'Beneficiary or TOD on file', kind: 'text', wide: true },
      { key: 'advisor', label: 'Advisor', kind: 'text' },
      phone,
      website,
      access,
    ],
  },
  {
    id: 'property',
    label: 'Home & Mortgage',
    singular: 'property',
    description: 'Homes, land, vehicles, and the loans against them.',
    prompt: 'Add the property, the lender or servicer, the loan’s last 4 digits, and where the deed or title is.',
    icon: 'property',
    fields: [
      {
        key: 'assetType',
        label: 'Type',
        kind: 'select',
        options: ['Primary home', 'Second home', 'Rental property', 'Land', 'Vehicle', 'Boat or RV', 'Other'],
      },
      { key: 'address', label: 'Address or description', kind: 'text', wide: true },
      { key: 'lender', label: 'Mortgage lender or servicer', kind: 'text', summary: true },
      { ...ref, label: 'Loan number, last 4 only' },
      phone,
      { key: 'payment', label: 'Paid automatically from', kind: 'text' },
      { ...docs, label: 'Where the deed or title is' },
    ],
  },
  {
    id: 'insurance',
    label: 'Other Insurance',
    singular: 'policy',
    description: 'Health, home, auto, umbrella, disability, and long-term care.',
    prompt: 'Add the insurer, policy type, and the number to call. Family may need to keep some active.',
    icon: 'insurance',
    fields: [
      {
        key: 'policyType',
        label: 'Coverage',
        kind: 'select',
        summary: true,
        options: [
          'Health',
          'Homeowners',
          'Renters',
          'Auto',
          'Umbrella',
          'Disability',
          'Long-term care',
          'Dental or vision',
          'Other',
        ],
      },
      { key: 'institution', label: 'Insurer', kind: 'text', summary: true },
      { ...ref, label: 'Policy number, last 4 only' },
      { key: 'agent', label: 'Agent', kind: 'text' },
      phone,
      { key: 'renewal', label: 'Renews on', kind: 'date' },
      website,
    ],
  },
  {
    id: 'debts',
    label: 'Debts & Credit',
    singular: 'debt',
    description: 'Credit cards, auto and student loans, and lines of credit.',
    prompt: 'List each lender and how it is paid, so nothing lapses or gets paid twice.',
    icon: 'debts',
    fields: [
      {
        key: 'debtType',
        label: 'Type',
        kind: 'select',
        options: ['Credit card', 'Auto loan', 'Student loan', 'Personal loan', 'HELOC', 'Medical', 'Other'],
      },
      { key: 'institution', label: 'Lender or card issuer', kind: 'text', summary: true },
      ref,
      phone,
      { key: 'payment', label: 'Paid automatically from', kind: 'text' },
      website,
    ],
  },
  {
    id: 'benefits',
    label: 'Income & Benefits',
    singular: 'benefit',
    description: 'Employer, pension, Social Security, veterans, and union benefits.',
    prompt: 'Add each source of income or benefits and the contact who handles survivor claims.',
    icon: 'benefits',
    fields: [
      {
        key: 'benefitType',
        label: 'Type',
        kind: 'select',
        summary: true,
        options: [
          'Employer benefits',
          'Pension',
          'Social Security',
          'Veterans (VA)',
          'Union',
          'Annuity income',
          'Other',
        ],
      },
      { key: 'institution', label: 'Organization', kind: 'text', summary: true },
      { key: 'contact', label: 'HR or benefits contact', kind: 'text' },
      phone,
      website,
    ],
  },
  {
    id: 'digital',
    label: 'Digital Life',
    singular: 'account',
    description: 'Email, phone carrier, password manager, photos, and subscriptions.',
    prompt: 'Start with your phone carrier and primary email. They receive the codes that unlock everything else.',
    icon: 'digital',
    fields: [
      {
        key: 'accountType',
        label: 'Kind of account',
        kind: 'select',
        summary: true,
        options: [
          'Mobile phone carrier',
          'Primary email',
          'Password manager',
          'Photos and cloud storage',
          'Social media',
          'Subscription',
          'Domain or website',
          'Other',
        ],
      },
      { key: 'institution', label: 'Service', kind: 'text', summary: true },
      { key: 'login', label: 'Sign-in email or username', kind: 'text' },
      { key: 'legacy', label: 'Legacy contact or inactive-account setting', kind: 'text' },
      {
        key: 'wish',
        label: 'What should happen to it',
        kind: 'select',
        options: ['Keep active', 'Memorialize', 'Download, then close', 'Close', 'Transfer to someone'],
      },
      access,
    ],
  },
  {
    id: 'contacts',
    label: 'Key People',
    singular: 'person',
    description: 'Executor, attorney, accountant, advisor, and who to call first.',
    prompt: 'Add your executor first, then your attorney, accountant, and anyone who should hear early.',
    icon: 'contacts',
    fields: [
      {
        key: 'role',
        label: 'Role',
        kind: 'select',
        summary: true,
        options: [
          'Executor',
          'Successor trustee',
          'Attorney',
          'Accountant or CPA',
          'Financial advisor',
          'Insurance agent',
          'Guardian for children',
          'Employer or HR',
          'Doctor',
          'Clergy or officiant',
          'Close friend',
          'Other',
        ],
      },
      { key: 'organization', label: 'Firm or organization', kind: 'text' },
      { ...phone, summary: true },
      { key: 'email', label: 'Email', kind: 'email' },
    ],
  },
  {
    id: 'household',
    label: 'Home Life & Wishes',
    singular: 'item',
    description: 'Pets, keys, utilities, storage, and funeral wishes.',
    prompt: 'Note the things only you know: who takes the dog, where the spare keys are, what you want for a service.',
    icon: 'household',
    fields: [
      {
        key: 'itemType',
        label: 'Kind',
        kind: 'select',
        summary: true,
        options: [
          'Funeral and burial wishes',
          'Pets',
          'Keys and combinations (location only)',
          'Utilities',
          'Storage unit',
          'Mail and deliveries',
          'Other',
        ],
      },
      { key: 'contact', label: 'Who to contact', kind: 'text' },
      phone,
      { key: 'location', label: 'Where it is', kind: 'text', wide: true },
    ],
  },
];

const byId = new Map<CategoryId, CategoryDef>(CATEGORIES.map((c) => [c.id, c]));

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function getCategory(id: CategoryId): CategoryDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}

export const PRIORITY_LABELS: Readonly<Record<Priority, string>> = {
  'first-week': 'First week',
  'first-month': 'First month',
  'when-ready': 'When ready',
};
