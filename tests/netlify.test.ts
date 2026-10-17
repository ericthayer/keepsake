import test from "node:test";
import assert from "node:assert/strict";
import { createAgentKey, listAgentKeys, resolveAgentOwner, revokeAgentKey } from "../lib/server/api-keys";
import { handleApi } from "../lib/server/api-handler";
import { handleRemoteMcp } from "../lib/server/mcp-handler";
import { emptyLocker } from "../lib/locker";
import { fixture } from "./helpers/postgres";

function request(path: string, method = "GET", body?: unknown, origin = "https://keepsake.example") {
  return new Request(`https://keepsake.example${path}`, { method, headers: { "Content-Type": "application/json", Origin: origin }, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("legacy Sites headers cannot impersonate a signed-in owner", async () => {
  const req = request("/api/locker");
  req.headers.set("oai-authenticated-user-id", "owner-a");
  const response = await handleApi(req, null, () => { throw new Error("Database must not be accessed"); });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("HTTP saves enforce session owner, origin, schema and expected version", async () => {
  const f = await fixture();
  try {
    const user = { id: "owner-a" }, store = () => f.store;
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: emptyLocker, version: 0 }, "https://attacker.example"), user, store)).status, 403);
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: {}, version: 0 }), user, store)).status, 400);
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: emptyLocker, version: 0 }), user, store)).status, 200);
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: emptyLocker, version: 0 }), user, store)).status, 409);
    assert.equal((await f.store.read("owner-b")).locker, null);
    assert.equal((await f.store.read("owner-a")).version, 1);
  } finally { await f.pg.close(); }
});

test("agent keys are hashed, owner-bound, revocable and never listed as secrets", async () => {
  const f = await fixture();
  try {
    const key = await createAgentKey(f.store, "owner-a", "My agent");
    const rows = await f.pg.query("SELECT * FROM agent_api_keys");
    assert.ok(!JSON.stringify(rows).includes(key.token));
    assert.ok(!JSON.stringify(await listAgentKeys(f.store, "owner-a")).includes(key.token));
    assert.equal((await listAgentKeys(f.store, "owner-b")).length, 0);
    const req = request("/mcp"); req.headers.set("Authorization", `Bearer ${key.token}`);
    assert.equal(await resolveAgentOwner(f.store, req), "owner-a");
    await assert.rejects(() => revokeAgentKey(f.store, "owner-b", key.id), /not found/);
    await revokeAgentKey(f.store, "owner-a", key.id);
    assert.equal(await resolveAgentOwner(f.store, req), null);
    assert.equal((await listAgentKeys(f.store, "owner-a")).length, 0);
  } finally { await f.pg.close(); }
});

test("the remote endpoint requires a bearer key before dispatch and honors revocation", async () => {
  assert.equal((await handleRemoteMcp(request("/mcp", "POST", {}), () => { throw new Error("No database access"); })).status, 401);
  const f = await fixture();
  try {
    const key = await createAgentKey(f.store, "owner-a", "My agent");
    const req = () => { const r = request("/mcp", "POST", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "keepsake_get_overview", arguments: {} } }); r.headers.set("Authorization", `Bearer ${key.token}`); return r; };
    const response = await handleRemoteMcp(req(), () => f.store);
    assert.equal(response.status, 200);
    const body = await response.json() as { result: { structuredContent: { accounts: number; exampleData: boolean } } };
    assert.equal(body.result.structuredContent.accounts, 0);
    assert.equal(body.result.structuredContent.exampleData, false);
    await revokeAgentKey(f.store, "owner-a", key.id);
    assert.equal((await handleRemoteMcp(req(), () => f.store)).status, 401);
  } finally { await f.pg.close(); }
});

test("competing first saves cannot overwrite each other", async () => {
  const f = await fixture();
  try {
    const results = await Promise.allSettled([f.store.save("owner-a", { ...emptyLocker, message: "First" }, 0), f.store.save("owner-a", { ...emptyLocker, message: "Second" }, 0)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await f.store.read("owner-a")).version, 1);
  } finally { await f.pg.close(); }
});
