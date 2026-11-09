import test from "node:test";
import assert from "node:assert/strict";
import { createAgentKey, listAgentKeys, resolveAgentOwner, revokeAgentKey } from "../lib/server/api-keys";
import { handleApi } from "../lib/server/api-handler";
import { handleRemoteMcp } from "../lib/server/mcp-handler";
import { emptyLocker } from "../lib/locker";
import type { LockerStore } from "../lib/server/locker-store";
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

test("unexpected server failures are logged without leaking details to clients or locker data to logs", async t => {
  const logged: string[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args.map(String).join(" ")); });
  const failingStore = () => { throw new Error("connect ECONNREFUSED 10.0.0.5:5432"); };
  const req = request("/api/locker", "PUT", { locker: { ...emptyLocker, message: "PRIVATE-FAMILY-NOTE" }, version: 0 });
  req.headers.set("x-nf-request-id", "req-123");
  const response = await handleApi(req, { id: "owner-a", email: "owner@example.com" }, failingStore);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(!body.includes("ECONNREFUSED"));
  assert.equal(logged.length, 1);
  const entry = JSON.parse(logged[0]) as Record<string, unknown>;
  assert.deepEqual({ scope: entry.scope, route: entry.route, method: entry.method, requestId: entry.requestId, error: entry.error }, { scope: "api", route: "/api/locker", method: "PUT", requestId: "req-123", error: "Error" });
  assert.match(String(entry.message), /ECONNREFUSED/);
  assert.ok(!logged[0].includes("PRIVATE-FAMILY-NOTE") && !logged[0].includes("owner@example.com") && !logged[0].includes("owner-a"));

  const mcpReq = request("/mcp", "POST", {}); mcpReq.headers.set("Authorization", "Bearer ks_" + "a".repeat(43));
  assert.equal((await handleRemoteMcp(mcpReq, failingStore)).status, 503);
  assert.equal(logged.length, 2);
  const mcpEntry = JSON.parse(logged[1]) as Record<string, unknown>;
  assert.equal(mcpEntry.scope, "mcp");
  assert.ok(typeof mcpEntry.requestId === "string" && mcpEntry.requestId.length > 0);
  assert.ok(!logged[1].includes("ks_"));
});

test("expected client errors are not logged as server failures", async t => {
  const logged: unknown[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args); });
  const f = await fixture();
  try {
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: {}, version: 0 }), { id: "owner-a" }, () => f.store)).status, 400);
    assert.equal((await handleApi(request("/api/locker", "PUT", { locker: emptyLocker, version: 5 }), { id: "owner-a" }, () => f.store)).status, 409);
    assert.equal(logged.length, 0);
  } finally { await f.pg.close(); }
});

test("agent tool calls that hit an unexpected failure are logged on both the UI and remote endpoints", async t => {
  const logged: string[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args.map(String).join(" ")); });
  const brokenStore = {
    db: { query: async () => ({ rows: [{ owner_id: "owner-a" }] }) },
    read: async () => { throw new Error("terminating connection due to administrator command"); },
  } as unknown as LockerStore;
  const call = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "keepsake_get_overview", arguments: {} } };
  const ui = await handleApi(request("/api/agent", "POST", { name: "keepsake_get_overview", arguments: {} }), { id: "owner-a" }, () => brokenStore);
  assert.deepEqual(((await ui.json()) as { isError: boolean; structuredContent: { code: string } }).structuredContent.code, "SERVICE_UNAVAILABLE");
  const mcpReq = request("/mcp", "POST", call); mcpReq.headers.set("Authorization", "Bearer ks_" + "a".repeat(43));
  assert.equal((await handleRemoteMcp(mcpReq, () => brokenStore)).status, 200);
  assert.deepEqual(logged.map(line => (JSON.parse(line) as { scope: string; route: string }).route), ["/api/agent", "/mcp"]);
  assert.ok(logged.every(line => /administrator command/.test(line) && !line.includes("owner-a")));
});
