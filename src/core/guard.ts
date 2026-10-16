// Sensitive-data guard. The locker stores where things are, never the keys to them.
import type { TextFieldKind } from './types.ts';

export type FindingKind = 'ssn' | 'card' | 'long-number' | 'secret';

export interface Finding {
  readonly kind: FindingKind;
  readonly message: string;
}

const SSN = /\b\d{3}[- ]\d{2}[- ]\d{4}\b/;
const DIGIT_RUN = /\d[\d -]{11,22}\d/g;
const LONG_NUMBER = /\d{7,}/;
// "PIN: 4821" or "password is hunter2" — but not "PIN is in the password manager".
const SECRET =
  /\b(?:password|passwd|pwd|passcode|pin|passphrase|security answer|seed phrase|recovery phrase|recovery code)s?\b\s*(?:[:=]|\bis\b(?!\s+(?:in|at|on|with|kept|stored|written|saved|located|under|inside)\b))\s*\S/i;

/** Fields where long digit runs are expected and harmless. */
const NUMERIC_OK: ReadonlySet<TextFieldKind> = new Set(['tel', 'currency', 'date']);

export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function hasCardNumber(value: string): boolean {
  for (const match of value.matchAll(DIGIT_RUN)) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) return true;
  }
  return false;
}

export function inspect(value: string, kind: TextFieldKind = 'text'): Finding[] {
  const text = value.trim();
  if (!text) return [];
  const findings: Finding[] = [];

  if (SSN.test(text)) {
    findings.push({
      kind: 'ssn',
      message: 'This looks like a Social Security number. Leave it out; family can find it on tax returns.',
    });
  }
  if (hasCardNumber(text)) {
    findings.push({ kind: 'card', message: 'This looks like a full card number. Keep only the last 4 digits.' });
  } else if (!NUMERIC_OK.has(kind) && LONG_NUMBER.test(text.replace(/[ -]/g, '')) && findings.length === 0) {
    findings.push({
      kind: 'long-number',
      message: 'Long numbers can identify an account. Keep only the last 4 digits.',
    });
  }
  if (SECRET.test(text)) {
    findings.push({
      kind: 'secret',
      message: 'Don’t store passwords or PINs here. Write down where they’re kept instead.',
    });
  }
  return findings;
}
