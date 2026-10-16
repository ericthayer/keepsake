// Zero-knowledge envelope: PBKDF2-SHA-256 → AES-256-GCM, all through WebCrypto.
// The key never leaves memory and is created non-extractable.

export const FORMAT = 'life-locker';
export const KDF_ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-SHA-256
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 10_000_000; // refuse files that would hang the tab
const AAD = new TextEncoder().encode(`${FORMAT}:v1`);

export interface KdfParams {
  readonly name: 'PBKDF2';
  readonly hash: 'SHA-256';
  readonly iterations: number;
  readonly salt: string; // base64
}

export interface Envelope {
  readonly format: typeof FORMAT;
  readonly v: 1;
  /** Plaintext, deliberately: tells family where the passphrase is written down. */
  readonly hint: string;
  readonly kdf: KdfParams;
  readonly cipher: { readonly name: 'AES-GCM'; readonly iv: string };
  readonly data: string; // base64 ciphertext
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('That passphrase does not open this locker.');
    this.name = 'WrongPassphraseError';
  }
}

export class InvalidLockerFileError extends Error {
  constructor(reason: string) {
    super(`This is not a Life Locker file (${reason}).`);
    this.name = 'InvalidLockerFileError';
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function newKdfParams(): KdfParams {
  return { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: toBase64(randomBytes(16)) };
}

export async function deriveKey(passphrase: string, kdf: KdfParams): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: kdf.hash, iterations: kdf.iterations, salt: fromBase64(kdf.salt) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(plaintext: string, key: CryptoKey, kdf: KdfParams, hint: string): Promise<Envelope> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    format: FORMAT,
    v: 1,
    hint,
    kdf,
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    data: toBase64(new Uint8Array(data)),
  };
}

export async function unseal(envelope: Envelope, key: CryptoKey): Promise<string> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.cipher.iv), additionalData: AAD },
      key,
      fromBase64(envelope.data),
    );
    return new TextDecoder().decode(plain);
  } catch {
    // AES-GCM authentication failure: wrong key or tampered data. Same answer for both.
    throw new WrongPassphraseError();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates untrusted JSON (a picked file or a fetched vault.locker) into an Envelope. */
export function parseEnvelope(raw: unknown): Envelope {
  if (!isRecord(raw) || raw['format'] !== FORMAT) throw new InvalidLockerFileError('missing format marker');
  if (raw['v'] !== 1) throw new InvalidLockerFileError('unsupported version');
  const { kdf, cipher, data, hint } = raw;
  if (!isRecord(kdf) || kdf['name'] !== 'PBKDF2' || kdf['hash'] !== 'SHA-256') {
    throw new InvalidLockerFileError('unknown key derivation');
  }
  const iterations = kdf['iterations'];
  if (typeof iterations !== 'number' || !Number.isInteger(iterations)) {
    throw new InvalidLockerFileError('bad iteration count');
  }
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new InvalidLockerFileError('iteration count out of range');
  }
  if (typeof kdf['salt'] !== 'string' || !isRecord(cipher) || cipher['name'] !== 'AES-GCM') {
    throw new InvalidLockerFileError('unknown cipher');
  }
  if (typeof cipher['iv'] !== 'string' || typeof data !== 'string') {
    throw new InvalidLockerFileError('missing ciphertext');
  }
  return {
    format: FORMAT,
    v: 1,
    hint: typeof hint === 'string' ? hint.slice(0, 280) : '',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: kdf['salt'] },
    cipher: { name: 'AES-GCM', iv: cipher['iv'] },
    data,
  };
}

export interface Strength {
  readonly score: 0 | 1 | 2 | 3;
  readonly label: 'Too short' | 'Weak' | 'Fair' | 'Strong';
  readonly acceptable: boolean;
}

/** Rough entropy estimate. Long passphrases of plain words score well, which is the point. */
export function passphraseStrength(passphrase: string): Strength {
  const length = [...passphrase].length;
  if (length < 12) return { score: 0, label: 'Too short', acceptable: false };
  let pool = 0;
  if (/[a-z]/.test(passphrase)) pool += 26;
  if (/[A-Z]/.test(passphrase)) pool += 26;
  if (/\d/.test(passphrase)) pool += 10;
  if (/[^a-zA-Z\d]/.test(passphrase)) pool += 33;
  const unique = new Set(passphrase.toLowerCase()).size;
  const bits = Math.log2(Math.max(pool, 2)) * length * Math.min(1, unique / 8);
  if (bits < 60) return { score: 1, label: 'Weak', acceptable: false };
  if (bits < 80) return { score: 2, label: 'Fair', acceptable: true };
  return { score: 3, label: 'Strong', acceptable: true };
}
