import { createHash, randomBytes, randomUUID } from "node:crypto";
import { LockerError, type ApiKeyView, type LockerStore } from "./locker-store";

const hash = (key: string) => createHash("sha256").update(key).digest("hex");
export async function createAgentKey(store: LockerStore, ownerId: string, name: string) {
  const token = `ks_${randomBytes(32).toString("base64url")}`;
  const id = randomUUID(), createdAt = new Date().toISOString();
  await store.transaction(ownerId, async client => {
    const { rows: [row] } = await client.query<{ total: string }>("SELECT COUNT(*) AS total FROM agent_api_keys WHERE owner_id = $1 AND revoked_at IS NULL", [ownerId]);
    if (Number(row.total) >= 5) throw new LockerError("Revoke an existing agent key before creating another.", 429, "KEY_LIMIT");
    await client.query("INSERT INTO agent_api_keys (id, owner_id, name, key_hash, created_at) VALUES ($1,$2,$3,$4,$5)", [id, ownerId, name, hash(token), createdAt]);
  });
  return { id, name, created_at: createdAt, token };
}
export async function listAgentKeys(store: LockerStore, ownerId: string): Promise<ApiKeyView[]> {
  return (await store.db.query<ApiKeyView>("SELECT id, name, created_at, revoked_at FROM agent_api_keys WHERE owner_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC", [ownerId])).rows;
}
export async function revokeAgentKey(store: LockerStore, ownerId: string, id: string) {
  const result = await store.db.query("UPDATE agent_api_keys SET revoked_at = $1 WHERE id = $2 AND owner_id = $3 AND revoked_at IS NULL RETURNING id", [new Date().toISOString(), id, ownerId]);
  if (!result.rows.length) throw new LockerError("Agent key not found.", 404, "NOT_FOUND");
}
export async function resolveAgentOwner(store: LockerStore, request: Request): Promise<string | null> {
  const match = request.headers.get("authorization")?.match(/^Bearer (ks_[A-Za-z0-9_-]{43})$/i);
  if (!match) return null;
  const { rows: [row] } = await store.db.query<{ owner_id: string }>("SELECT owner_id FROM agent_api_keys WHERE key_hash = $1 AND revoked_at IS NULL", [hash(match[1])]);
  return row?.owner_id ?? null;
}
