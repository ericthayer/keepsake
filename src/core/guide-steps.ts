// Universal first steps, ordered. General guidance for the US, not legal advice.
import type { Priority } from './types.ts';

export interface GuideStep {
  readonly title: string;
  readonly detail: string;
}

export const GUIDE_STEPS: Readonly<Record<Priority, readonly GuideStep[]>> = {
  'first-week': [
    {
      title: 'Order certified copies of the death certificate',
      detail: 'Ask the funeral home for 10 to 15. Banks, insurers, and agencies each keep one.',
    },
    {
      title: 'Call the executor and find the original will',
      detail: 'Nothing is distributed until the executor is confirmed. Copies are rarely accepted.',
    },
    {
      title: 'Keep the phone line and email active',
      detail: 'Account verification codes are sent there. Cancel them last, after accounts are transferred.',
    },
    {
      title: 'Secure the home, vehicles, and mail',
      detail: 'Lock up, keep insurance in force, and have someone collect mail.',
    },
  ],
  'first-month': [
    {
      title: 'Notify Social Security',
      detail: 'The funeral home usually does this. If not, call 1-800-772-1213. Some payments must be returned.',
    },
    {
      title: 'File life insurance claims',
      detail: 'Each insurer needs a death certificate and a claim form. Check employer group policies too.',
    },
    {
      title: 'Contact banks and investment firms',
      detail: 'Ask what each account needs. Joint, POD, and TOD accounts usually transfer without probate.',
    },
    {
      title: 'Ask the credit bureaus to flag the record as deceased',
      detail: 'Equifax, Experian, and TransUnion. This prevents new credit being opened in the name.',
    },
  ],
  'when-ready': [
    {
      title: 'Close, memorialize, or transfer digital accounts',
      detail: 'Download photos first. Follow the wishes noted in Digital Life.',
    },
    {
      title: 'Cancel subscriptions and recurring charges',
      detail: 'Card and bank statements from the last three months show what renews.',
    },
    {
      title: 'Plan for the final tax return',
      detail: 'An accountant can file the final personal return and any estate return.',
    },
  ],
};
