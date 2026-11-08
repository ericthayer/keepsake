import test from "node:test";
import assert from "node:assert/strict";
import { handleApi, type Owner } from "../lib/server/api-handler";
import { emptyLocker } from "../lib/locker";
import { fixture } from "./helpers/postgres";

const owner: Owner = { id: "owner-a", email: "owner@example.com" };
const mom: Owner = { id: "member-b", email: "Mom@Example.com" };
const stranger: Owner = { id: "stranger-c", email: "stranger@example.com" };

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`https://keepsake.example${path}`, { method, headers: { "Content-Type": "application/json", Origin: "https://keepsake.example" }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function call(f: Awaited<ReturnType<typeof fixture>>, user: Owner, path: string, method = "GET", body?: unknown) {
  const response = await handleApi(request(path, method, body), user, () => f.store);
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}
async function invite(f: Awaited<ReturnType<typeof fixture>>, role: "editor" | "viewer", email = "mom@example.com") {
  const created = await call(f, owner, "/api/locker-sharing", "POST", { email, role });
  assert.equal(created.status, 201);
  return created.body as { id: string; token: string; acceptUrl: string };
}

test("non-members cannot read, write or inspect someone else's locker", async () => {
  const f = await fixture();
  try {
    await f.store.save("owner-a", { ...emptyLocker, message: "Private" }, 0);
    assert.equal((await call(f, stranger, "/api/locker?locker=owner-a")).status, 404);
    assert.equal((await call(f, stranger, "/api/locker?locker=owner-a", "PUT", { locker: emptyLocker, version: 1 })).status, 404);
    assert.equal((await call(f, stranger, "/api/locker-sharing?locker=owner-a")).status, 404);
    assert.equal((await call(f, stranger, "/api/locker-sharing?locker=owner-a", "POST", { email: "x@example.com", role: "editor" })).status, 404);
    assert.equal((await f.store.read("owner-a")).locker?.message, "Private");
  } finally { await f.pg.close(); }
});

test("invites are email-bound, single-use and stored only as a hash", async () => {
  const f = await fixture();
  try {
    const created = await invite(f, "viewer");
    assert.ok(created.acceptUrl.startsWith("https://keepsake.example/?invite=ksi_"));
    assert.ok(!JSON.stringify((await f.pg.query("SELECT * FROM locker_invites")).rows).includes(created.token));
    assert.ok(!JSON.stringify((await call(f, owner, "/api/locker-sharing")).body).includes(created.token));
    assert.equal((await call(f, stranger, "/api/locker-invites/accept", "POST", { token: created.token })).status, 404);
    const accepted = await call(f, mom, "/api/locker-invites/accept", "POST", { token: created.token });
    assert.deepEqual(accepted.body, { lockerId: "owner-a", role: "viewer", alreadyAccepted: false });
    assert.equal((await call(f, mom, "/api/locker-invites/accept", "POST", { token: created.token })).body.alreadyAccepted, true);
    const { body } = await call(f, mom, "/api/lockers");
    assert.deepEqual(body.lockers, [{ id: "member-b", role: "owner" }, { id: "owner-a", role: "viewer" }]);
  } finally { await f.pg.close(); }
});

test("viewers can read but not write; editors can write; only the owner manages sharing", async () => {
  const f = await fixture();
  try {
    await call(f, mom, "/api/locker-invites/accept", "POST", { token: (await invite(f, "viewer")).token });
    assert.equal((await call(f, mom, "/api/locker?locker=owner-a")).status, 200);
    assert.equal((await call(f, mom, "/api/locker?locker=owner-a", "PUT", { locker: emptyLocker, version: 0 })).status, 403);
    const editor: Owner = { id: "member-d", email: "dad@example.com" };
    await call(f, editor, "/api/locker-invites/accept", "POST", { token: (await invite(f, "editor", "dad@example.com")).token });
    assert.equal((await call(f, editor, "/api/locker?locker=owner-a", "PUT", { locker: { ...emptyLocker, message: "From Dad" }, version: 0 })).status, 200);
    assert.equal((await f.store.read("owner-a")).locker?.message, "From Dad");
    assert.equal((await call(f, editor, "/api/locker-sharing?locker=owner-a")).status, 403);
    assert.equal((await call(f, editor, "/api/locker-sharing?locker=owner-a", "POST", { email: "x@example.com", role: "editor" })).status, 403);
    assert.equal((await call(f, editor, "/api/locker-sharing?locker=owner-a", "DELETE", { userId: "member-b" })).status, 403);
    const sharing = await call(f, owner, "/api/locker-sharing");
    assert.equal((sharing.body.members as unknown[]).length, 2);
  } finally { await f.pg.close(); }
});

test("removal and revocation take effect immediately; members can leave", async () => {
  const f = await fixture();
  try {
    await call(f, mom, "/api/locker-invites/accept", "POST", { token: (await invite(f, "editor")).token });
    assert.equal((await call(f, owner, "/api/locker-sharing", "DELETE", { userId: "member-b" })).status, 200);
    assert.equal((await call(f, mom, "/api/locker?locker=owner-a")).status, 404);
    const pending = await invite(f, "viewer");
    assert.equal((await call(f, owner, "/api/locker-sharing", "DELETE", { inviteId: pending.id })).status, 200);
    assert.equal((await call(f, mom, "/api/locker-invites/accept", "POST", { token: pending.token })).status, 404);
    await call(f, mom, "/api/locker-invites/accept", "POST", { token: (await invite(f, "viewer")).token });
    assert.equal((await call(f, mom, "/api/locker-sharing?locker=owner-a", "DELETE", { userId: "member-b" })).status, 200);
    assert.equal((await call(f, mom, "/api/locker?locker=owner-a")).status, 404);
  } finally { await f.pg.close(); }
});

test("expired invites cannot be accepted and owners cannot invite themselves", async () => {
  const f = await fixture();
  try {
    const created = await invite(f, "viewer");
    await f.pg.query("UPDATE locker_invites SET expires_at = '2000-01-01T00:00:00.000Z'");
    assert.equal((await call(f, mom, "/api/locker-invites/accept", "POST", { token: created.token })).status, 410);
    assert.equal((await call(f, owner, "/api/locker-sharing", "POST", { email: "OWNER@example.com", role: "editor" })).status, 400);
  } finally { await f.pg.close(); }
});
