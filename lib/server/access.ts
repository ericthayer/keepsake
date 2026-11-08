import { LockerError, type Database } from "./locker-store";

export type Role = "owner" | "editor" | "viewer";
export type LockerAccess = { lockerId: string; userId: string; role: Role };
export type LockerSummary = { id: string; role: Role };

const rank: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

/** Every locker read or write resolves access here first. A locker id is its owner's user id. */
export async function resolveAccess(db: Pick<Database, "query">, userId: string, lockerId = userId): Promise<LockerAccess> {
  if (lockerId === userId) return { lockerId, userId, role: "owner" };
  const { rows: [row] } = await db.query<{ role: "editor" | "viewer" }>("SELECT role FROM locker_members WHERE locker_id = $1 AND user_id = $2", [lockerId, userId]);
  // Non-members get the same answer as a locker that does not exist.
  if (!row) throw new LockerError("Locker not found.", 404, "NOT_FOUND");
  return { lockerId, userId, role: row.role };
}

export function requireRole(access: LockerAccess, needed: Role): LockerAccess {
  if (rank[access.role] < rank[needed]) throw new LockerError(needed === "owner" ? "Only the locker owner can do this." : "You have view-only access to this locker.", 403, "FORBIDDEN");
  return access;
}

export async function authorize(db: Pick<Database, "query">, userId: string, lockerId: string | undefined, needed: Role): Promise<LockerAccess> {
  return requireRole(await resolveAccess(db, userId, lockerId), needed);
}

export async function listLockers(db: Pick<Database, "query">, userId: string): Promise<LockerSummary[]> {
  const { rows } = await db.query<{ locker_id: string; role: "editor" | "viewer" }>("SELECT locker_id, role FROM locker_members WHERE user_id = $1 ORDER BY created_at", [userId]);
  return [{ id: userId, role: "owner" }, ...rows.map(row => ({ id: row.locker_id, role: row.role }))];
}
