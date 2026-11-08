import { createHash, randomBytes, randomUUID } from "node:crypto";
import { requireRole, type LockerAccess } from "./access";
import { LockerError, type LockerStore } from "./locker-store";

export type MemberRole = "editor" | "viewer";
export type MemberView = { user_id: string; role: MemberRole; created_at: string };
export type InviteView = { id: string; email: string; role: MemberRole; created_at: string; expires_at: string };

const INVITE_DAYS = 7, SHARE_LIMIT = 20;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createInvite(store: LockerStore, access: LockerAccess, email: string, role: MemberRole, now = new Date()) {
  requireRole(access, "owner");
  const normalized = email.trim().toLowerCase();
  const token = `ksi_${randomBytes(32).toString("base64url")}`;
  const invite: InviteView = { id: randomUUID(), email: normalized, role, created_at: now.toISOString(), expires_at: new Date(now.getTime() + INVITE_DAYS * 86400000).toISOString() };
  // The transaction creates the owner's locker row if it does not exist yet, so members can reference it.
  await store.transaction(access.lockerId, async client => {
    const { rows: [count] } = await client.query<{ total: string }>(
      "SELECT (SELECT COUNT(*) FROM locker_members WHERE locker_id = $1) + (SELECT COUNT(*) FROM locker_invites WHERE locker_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2) AS total",
      [access.lockerId, invite.created_at]);
    if (Number(count.total) >= SHARE_LIMIT) throw new LockerError("Remove a member or invite before adding another.", 429, "SHARE_LIMIT");
    await client.query("INSERT INTO locker_invites (id, locker_id, email, role, token_hash, invited_by, created_at, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [invite.id, access.lockerId, invite.email, role, hash(token), access.userId, invite.created_at, invite.expires_at]);
  });
  return { ...invite, token };
}

export async function listSharing(store: LockerStore, access: LockerAccess, now = new Date()) {
  requireRole(access, "owner");
  const [members, invites] = await Promise.all([
    store.db.query<MemberView>("SELECT user_id, role, created_at FROM locker_members WHERE locker_id = $1 ORDER BY created_at", [access.lockerId]),
    store.db.query<InviteView>("SELECT id, email, role, created_at, expires_at FROM locker_invites WHERE locker_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2 ORDER BY created_at", [access.lockerId, now.toISOString()]),
  ]);
  return { members: members.rows, invites: invites.rows };
}

export async function revokeInvite(store: LockerStore, access: LockerAccess, inviteId: string, now = new Date()) {
  requireRole(access, "owner");
  const result = await store.db.query("UPDATE locker_invites SET revoked_at = $1 WHERE id = $2 AND locker_id = $3 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id", [now.toISOString(), inviteId, access.lockerId]);
  if (!result.rows.length) throw new LockerError("Invite not found.", 404, "NOT_FOUND");
}

/** The owner can remove anyone; a member can only remove themselves (leave). */
export async function removeMember(store: LockerStore, access: LockerAccess, userId: string) {
  if (userId !== access.userId) requireRole(access, "owner");
  const result = await store.db.query("DELETE FROM locker_members WHERE locker_id = $1 AND user_id = $2 RETURNING user_id", [access.lockerId, userId]);
  if (!result.rows.length) throw new LockerError("Member not found.", 404, "NOT_FOUND");
}

type InviteRow = { id: string; locker_id: string; email: string; role: MemberRole; expires_at: string; accepted_at: string | null; accepted_by: string | null; revoked_at: string | null };

/** Accepting requires a signed-in user whose Identity email matches the invite, so a forwarded link is useless. */
export async function acceptInvite(store: LockerStore, user: { id: string; email?: string }, token: string, now = new Date()) {
  const missing = new LockerError("This invite is not valid for your account.", 404, "NOT_FOUND");
  const { rows: [found] } = await store.db.query<InviteRow>("SELECT locker_id FROM locker_invites WHERE token_hash = $1", [hash(token)]);
  if (!found) throw missing;
  return store.transaction(found.locker_id, async client => {
    const { rows: [invite] } = await client.query<InviteRow>("SELECT * FROM locker_invites WHERE token_hash = $1 FOR UPDATE", [hash(token)]);
    if (!invite || invite.revoked_at || invite.email !== user.email?.trim().toLowerCase()) throw missing;
    if (invite.accepted_at) {
      if (invite.accepted_by === user.id) return { lockerId: invite.locker_id, role: invite.role, alreadyAccepted: true };
      throw missing;
    }
    if (invite.expires_at <= now.toISOString()) throw new LockerError("This invite expired. Ask the owner for a new one.", 410, "INVITE_EXPIRED");
    if (invite.locker_id === user.id) throw new LockerError("You already own this locker.", 400, "OWN_LOCKER");
    const iso = now.toISOString();
    await client.query("INSERT INTO locker_members (locker_id, user_id, role, invited_by, created_at) SELECT locker_id, $2, role, invited_by, $3 FROM locker_invites WHERE id = $1 ON CONFLICT (locker_id, user_id) DO UPDATE SET role = EXCLUDED.role", [invite.id, user.id, iso]);
    await client.query("UPDATE locker_invites SET accepted_at = $1, accepted_by = $2 WHERE id = $3", [iso, user.id, invite.id]);
    return { lockerId: invite.locker_id, role: invite.role, alreadyAccepted: false };
  });
}
