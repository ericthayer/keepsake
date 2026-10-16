// Encrypted-envelope storage. IndexedDB when the browser allows it, memory otherwise.
import type { Envelope } from './crypto.ts';
import { parseEnvelope } from './crypto.ts';

export interface EnvelopeStore {
  readonly durable: boolean;
  load(): Promise<Envelope | null>;
  save(envelope: Envelope): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'life-locker';
const STORE = 'vault';
const KEY = 'primary';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function openDb(): Promise<IDBDatabase> {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  return request(req);
}

class IndexedDbStore implements EnvelopeStore {
  readonly durable = true;
  private readonly db: IDBDatabase;
  constructor(db: IDBDatabase) {
    this.db = db;
  }

  private tx(mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(STORE, mode).objectStore(STORE);
  }

  async load(): Promise<Envelope | null> {
    const raw: unknown = await request(this.tx('readonly').get(KEY));
    return raw === undefined ? null : parseEnvelope(raw);
  }

  async save(envelope: Envelope): Promise<void> {
    await request(this.tx('readwrite').put(envelope, KEY));
  }

  async clear(): Promise<void> {
    await request(this.tx('readwrite').delete(KEY));
  }
}

class MemoryStore implements EnvelopeStore {
  readonly durable = false;
  private value: Envelope | null = null;
  async load(): Promise<Envelope | null> {
    return this.value;
  }
  async save(envelope: Envelope): Promise<void> {
    this.value = envelope;
  }
  async clear(): Promise<void> {
    this.value = null;
  }
}

export async function openEnvelopeStore(): Promise<EnvelopeStore> {
  try {
    if (typeof indexedDB === 'undefined') return new MemoryStore();
    const store = new IndexedDbStore(await openDb());
    await store.load(); // surfaces blocked storage (private modes, sandboxed frames) up front
    return store;
  } catch {
    return new MemoryStore();
  }
}

/** A vault.locker published next to the site, for family to open. Absent is normal. */
export async function fetchPublishedEnvelope(url = './vault.locker'): Promise<Envelope | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) return null;
    return parseEnvelope(await res.json());
  } catch {
    return null;
  }
}

export async function readEnvelopeFile(file: File): Promise<Envelope> {
  if (file.size > 5_000_000) throw new Error('That file is too large to be a Life Locker file.');
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not a Life Locker file.');
  }
  return parseEnvelope(raw);
}
