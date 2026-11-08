import { z } from "zod";
import { lockerSchema } from "../locker";
import { AgentService } from "./agent-service";
import { authorize, listLockers } from "./access";
import { createAgentKey, listAgentKeys, revokeAgentKey } from "./api-keys";
import { acceptInvite, createInvite, listSharing, removeMember, revokeInvite } from "./sharing";
import { LockerError, type LockerStore } from "./locker-store";
import { HttpError, jsonResponse, readJson, sameOrigin } from "./http";

const lockerIdSchema = z.string().min(1).max(200);
export type Owner = { id: string; name?: string; email?: string };
export async function handleApi(request: Request, user: Owner | null, getStore: () => LockerStore): Promise<Response> {
  if (!user) return jsonResponse({ error: "Sign in to access your locker." }, 401);
  const url = new URL(request.url), path = url.pathname;
  if (path === "/api/session" && request.method === "GET") return jsonResponse({ user: { id: user.id, name: user.name ?? "", email: user.email ?? "" } });
  if (!["GET", "PUT", "POST", "DELETE"].includes(request.method)) return jsonResponse({ error: "Method not allowed." }, 405);
  if (request.method !== "GET" && !sameOrigin(request)) return jsonResponse({ error: "Request origin is not allowed." }, 403);
  try {
    const store = getStore();
    // ?locker=<id> selects a shared locker; omitted means the caller's own.
    const lockerId = lockerIdSchema.optional().parse(url.searchParams.get("locker") ?? undefined);
    if (path === "/api/lockers" && request.method === "GET") return jsonResponse({ lockers: await listLockers(store.db, user.id) });
    if (path === "/api/locker" && request.method === "GET") return jsonResponse(await store.read((await authorize(store.db, user.id, lockerId, "viewer")).lockerId));
    if (path === "/api/locker" && request.method === "PUT") {
      const access = await authorize(store.db, user.id, lockerId, "editor");
      const data = z.object({ locker: lockerSchema, version: z.number().int().min(0) }).strict().parse(await readJson(request));
      return jsonResponse({ version: await store.save(access.lockerId, data.locker, data.version) });
    }
    if (path === "/api/locker-sharing") {
      const access = await authorize(store.db, user.id, lockerId, "viewer");
      if (request.method === "GET") return jsonResponse(await listSharing(store, access));
      if (request.method === "POST") {
        const input = z.object({ email: z.string().trim().email().max(200), role: z.enum(["editor", "viewer"]) }).strict().parse(await readJson(request, 2000));
        if (input.email.toLowerCase() === user.email?.trim().toLowerCase()) return jsonResponse({ error: "You already own this locker.", code: "OWN_LOCKER" }, 400);
        const invite = await createInvite(store, access, input.email, input.role);
        return jsonResponse({ ...invite, acceptUrl: new URL(`/?invite=${encodeURIComponent(invite.token)}`, url.origin).href }, 201);
      }
      if (request.method === "DELETE") {
        const input = z.union([z.object({ inviteId: z.string().uuid() }).strict(), z.object({ userId: lockerIdSchema }).strict()]).parse(await readJson(request, 2000));
        if ("inviteId" in input) await revokeInvite(store, access, input.inviteId); else await removeMember(store, access, input.userId);
        return jsonResponse({ removed: true });
      }
    }
    if (path === "/api/locker-invites/accept" && request.method === "POST") {
      const input = z.object({ token: z.string().regex(/^ksi_[A-Za-z0-9_-]{43}$/, "Invalid invite.") }).strict().parse(await readJson(request, 2000));
      return jsonResponse(await acceptInvite(store, user, input.token));
    }
    if (path === "/api/agent" && request.method === "POST") {
      const input = z.object({ name: z.string().min(1).max(128), arguments: z.unknown() }).strict().parse(await readJson(request, 64000));
      return jsonResponse(await new AgentService(store, undefined, undefined, new URL(request.url).origin).call(user.id, input.name, input.arguments ?? {}));
    }
    if (path === "/api/agent-keys") {
      if (request.method === "GET") return jsonResponse({ keys: await listAgentKeys(store, user.id) });
      if (request.method === "POST") {
        const input = z.object({ name: z.string().trim().min(1).max(80) }).strict().parse(await readJson(request, 2000));
        return jsonResponse(await createAgentKey(store, user.id, input.name), 201);
      }
      if (request.method === "DELETE") {
        const input = z.object({ id: z.string().uuid() }).strict().parse(await readJson(request, 2000));
        await revokeAgentKey(store, user.id, input.id);
        return jsonResponse({ revoked: true });
      }
    }
    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof z.ZodError) return jsonResponse({ error: error.issues[0]?.message ?? "Invalid input." }, 400);
    if (error instanceof HttpError || error instanceof LockerError) return jsonResponse({ error: error.message, code: error instanceof LockerError ? error.code : "INVALID_REQUEST" }, error.status);
    return jsonResponse({ error: "Your locker is temporarily unavailable. Please try again." }, 503);
  }
}
